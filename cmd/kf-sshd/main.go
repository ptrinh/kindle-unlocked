// kf-sshd: a tiny static SSH + SFTP server for jailbroken Kindles.
//
// Auth: public keys from <dir>/authorized_keys, or the password in
// <dir>/password.txt (created on first run). Host key lives in <dir>/host_ed25519.
package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"crypto/subtle"
	"encoding/binary"
	"encoding/pem"
	"flag"
	"fmt"
	"io"
	"log"
	"math/big"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"unsafe"

	"github.com/creack/pty"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

func main() {
	addr := flag.String("addr", ":22", "listen address")
	dir := flag.String("dir", "/mnt/us/kfree/ssh", "config directory")
	shell := flag.String("shell", "/bin/sh", "login shell")
	flag.Parse()

	if err := os.MkdirAll(*dir, 0700); err != nil {
		log.Fatal(err)
	}
	signer, err := hostKey(filepath.Join(*dir, "host_ed25519"))
	if err != nil {
		log.Fatal(err)
	}
	password, err := loadPassword(filepath.Join(*dir, "password.txt"))
	if err != nil {
		log.Fatal(err)
	}

	cfg := &ssh.ServerConfig{
		PasswordCallback: func(_ ssh.ConnMetadata, pw []byte) (*ssh.Permissions, error) {
			if password != "" && subtle.ConstantTimeCompare(pw, []byte(password)) == 1 {
				return nil, nil
			}
			return nil, fmt.Errorf("bad password")
		},
		PublicKeyCallback: func(_ ssh.ConnMetadata, key ssh.PublicKey) (*ssh.Permissions, error) {
			// Re-read every time so keys added over USB work without a restart.
			data, _ := os.ReadFile(filepath.Join(*dir, "authorized_keys"))
			for len(data) > 0 {
				k, _, _, rest, err := ssh.ParseAuthorizedKey(data)
				if err != nil {
					break
				}
				if subtle.ConstantTimeCompare(k.Marshal(), key.Marshal()) == 1 {
					return nil, nil
				}
				data = rest
			}
			return nil, fmt.Errorf("unknown key")
		},
	}
	cfg.AddHostKey(signer)

	ln, err := net.Listen("tcp", *addr)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("kf-sshd listening on %s", *addr)
	for {
		c, err := ln.Accept()
		if err != nil {
			continue
		}
		go handleConn(c, cfg, *shell)
	}
}

func hostKey(path string) (ssh.Signer, error) {
	if b, err := os.ReadFile(path); err == nil {
		return ssh.ParsePrivateKey(b)
	}
	_, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return nil, err
	}
	block, err := ssh.MarshalPrivateKey(priv, "kf-sshd")
	if err != nil {
		return nil, err
	}
	if err := os.WriteFile(path, pem.EncodeToMemory(block), 0600); err != nil {
		return nil, err
	}
	return ssh.NewSignerFromKey(priv)
}

// loadPassword returns the configured password, creating a random one on first
// run. An empty file disables password login.
func loadPassword(path string) (string, error) {
	if b, err := os.ReadFile(path); err == nil {
		return strings.TrimSpace(string(b)), nil
	}
	const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"
	pw := make([]byte, 10)
	for i := range pw {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		pw[i] = alphabet[n.Int64()]
	}
	return string(pw), os.WriteFile(path, append(pw, '\n'), 0600)
}

func handleConn(c net.Conn, cfg *ssh.ServerConfig, shell string) {
	sc, chans, reqs, err := ssh.NewServerConn(c, cfg)
	if err != nil {
		c.Close()
		return
	}
	defer sc.Close()
	go ssh.DiscardRequests(reqs)
	for nc := range chans {
		if nc.ChannelType() != "session" {
			nc.Reject(ssh.UnknownChannelType, "only sessions")
			continue
		}
		ch, in, err := nc.Accept()
		if err != nil {
			continue
		}
		go handleSession(ch, in, shell)
	}
}

type session struct {
	mu   sync.Mutex
	env  []string
	ptmx *os.File
	term string
	rows uint32
	cols uint32
}

func handleSession(ch ssh.Channel, in <-chan *ssh.Request, shell string) {
	s := &session{}
	defer ch.Close()
	for req := range in {
		switch req.Type {
		case "env":
			var kv struct{ K, V string }
			if ssh.Unmarshal(req.Payload, &kv) == nil {
				s.env = append(s.env, kv.K+"="+kv.V)
			}
			req.Reply(true, nil)
		case "pty-req":
			var p struct {
				Term                     string
				Cols, Rows, W, H         uint32
				Modes                    string
			}
			ssh.Unmarshal(req.Payload, &p)
			s.term, s.cols, s.rows = p.Term, p.Cols, p.Rows
			req.Reply(true, nil)
		case "window-change":
			if len(req.Payload) >= 8 {
				s.mu.Lock()
				s.cols = binary.BigEndian.Uint32(req.Payload)
				s.rows = binary.BigEndian.Uint32(req.Payload[4:])
				if s.ptmx != nil {
					setSize(s.ptmx, s.rows, s.cols)
				}
				s.mu.Unlock()
			}
		case "shell", "exec":
			var cmd *exec.Cmd
			if req.Type == "exec" {
				var p struct{ Cmd string }
				ssh.Unmarshal(req.Payload, &p)
				cmd = exec.Command(shell, "-c", p.Cmd)
			} else {
				cmd = exec.Command(shell, "-l")
			}
			req.Reply(true, nil)
			go func() {
				code := s.run(cmd, ch)
				ch.SendRequest("exit-status", false, ssh.Marshal(struct{ C uint32 }{uint32(code)}))
				ch.Close()
			}()
		case "subsystem":
			var p struct{ Name string }
			ssh.Unmarshal(req.Payload, &p)
			if p.Name != "sftp" {
				req.Reply(false, nil)
				continue
			}
			req.Reply(true, nil)
			go func() {
				srv, err := sftp.NewServer(ch)
				if err == nil {
					srv.Serve()
					srv.Close()
				}
				ch.SendRequest("exit-status", false, ssh.Marshal(struct{ C uint32 }{0}))
				ch.Close()
			}()
		default:
			if req.WantReply {
				req.Reply(false, nil)
			}
		}
	}
}

func (s *session) run(cmd *exec.Cmd, ch ssh.Channel) int {
	cmd.Env = append(os.Environ(), "HOME=/mnt/us", "PATH=/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin")
	cmd.Env = append(cmd.Env, s.env...)
	if _, err := os.Stat("/mnt/us"); err == nil {
		cmd.Dir = "/mnt/us"
	}
	if s.term != "" {
		cmd.Env = append(cmd.Env, "TERM="+s.term)
		ptmx, err := pty.Start(cmd)
		if err != nil {
			fmt.Fprintf(ch.Stderr(), "pty: %v\r\n", err)
			return 1
		}
		s.mu.Lock()
		s.ptmx = ptmx
		setSize(ptmx, s.rows, s.cols)
		s.mu.Unlock()
		go io.Copy(ptmx, ch)
		io.Copy(ch, ptmx)
		ptmx.Close()
	} else {
		cmd.Stdout, cmd.Stderr = ch, ch.Stderr()
		stdin, _ := cmd.StdinPipe()
		if err := cmd.Start(); err != nil {
			fmt.Fprintf(ch.Stderr(), "%v\n", err)
			return 127
		}
		go func() { io.Copy(stdin, ch); stdin.Close() }()
	}
	if err := cmd.Wait(); err != nil {
		if ee, ok := err.(*exec.ExitError); ok {
			return ee.ExitCode()
		}
		return 1
	}
	return 0
}

func setSize(f *os.File, rows, cols uint32) {
	ws := struct{ Row, Col, X, Y uint16 }{uint16(rows), uint16(cols), 0, 0}
	syscall.Syscall(syscall.SYS_IOCTL, f.Fd(), uintptr(syscall.TIOCSWINSZ), uintptr(unsafe.Pointer(&ws)))
}
