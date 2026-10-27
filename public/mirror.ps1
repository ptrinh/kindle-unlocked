# Kindle Mirror for Windows - show your PC screen (or part of it) on your Kindle.
#
# Needs the HTTP Server app on the Kindle with Remote on. Get the address and
# token from the Remote web app: Device -> "API token + examples".
#
#   irm https://kindle.trinh.uk/mirror.ps1 | iex
#
# Or save it and pass everything up front:
#   .\mirror.ps1 -Kindle 192.168.1.20:8080 -Token abc... [-Region "0,0,1280,800"] [-Every 2]
param(
    [string]$Kindle = "",
    [string]$Token = "",
    [string]$Region = "",
    [double]$Every = 2
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing, System.Windows.Forms
# Capture real pixels on scaled (HiDPI) displays.
Add-Type -Namespace KU -Name Dpi -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();'
[void][KU.Dpi]::SetProcessDPIAware()

if (-not $Kindle) { $Kindle = Read-Host "Kindle address (e.g. 192.168.1.20:8080)" }
if (-not $Token) {
    $secure = Read-Host "API token" -AsSecureString
    $Token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
}
if (-not $Region) { $Region = Read-Host "Region x,y,w,h (Enter = whole screen)" }
if ($Kindle -notmatch '^https?://') { $Kindle = "http://$Kindle" }
if ($Kindle -notmatch ':\d+$') { $Kindle = "$($Kindle):8080" }

if ($Region) {
    $p = $Region.Split(",") | ForEach-Object { [int]$_.Trim() }
    $rect = New-Object System.Drawing.Rectangle $p[0], $p[1], $p[2], $p[3]
} else {
    $rect = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
}

$headers = @{ Authorization = "Bearer $Token" }
try {
    Invoke-WebRequest -UseBasicParsing -Headers $headers "$Kindle/api/status" | Out-Null
} catch {
    Write-Host "Can't reach the Kindle at $Kindle (is HTTP Server on, with Remote enabled?)"
    return
}
Write-Host "Mirroring to $Kindle every $($Every)s - Ctrl+C to stop."

$md5 = [System.Security.Cryptography.MD5]::Create()
$last = ""
$n = 0
while ($true) {
    $shot = New-Object System.Drawing.Bitmap $rect.Width, $rect.Height
    $g = [System.Drawing.Graphics]::FromImage($shot)
    $g.CopyFromScreen($rect.Location, [System.Drawing.Point]::Empty, $rect.Size)
    $g.Dispose()

    # E-ink panels are ~1.5k px; smaller uploads are faster.
    $scale = [Math]::Min(1.0, 1600.0 / [Math]::Max($rect.Width, $rect.Height))
    $w = [int]($rect.Width * $scale); $h = [int]($rect.Height * $scale)
    $small = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($small)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($shot, 0, 0, $w, $h)
    $g.Dispose(); $shot.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $small.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $small.Dispose()
    $bytes = $ms.ToArray(); $ms.Dispose()

    $sum = [BitConverter]::ToString($md5.ComputeHash($bytes))
    if ($sum -ne $last) {
        $last = $sum
        # Partial refreshes are quick; every 15th frame does a full one to clear ghosting.
        $fast = if ($n % 15 -eq 0) { 0 } else { 1 }
        try {
            Invoke-WebRequest -UseBasicParsing -Method Post -Headers $headers -ContentType "image/png" `
                -Body $bytes "$Kindle/api/show?hold=1&fast=$fast" | Out-Null
            Write-Host -NoNewline "."
        } catch {
            Write-Host -NoNewline "x"
        }
        $n++
    }
    Start-Sleep -Milliseconds ([int]($Every * 1000))
}
