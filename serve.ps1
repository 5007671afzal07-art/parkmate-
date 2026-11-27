param(
    [int]$Port = 8080,
    [string]$Path = "C:\Users\Afzal\.gemini\antigravity\scratch\parkmate"
)

$endpoint = New-Object System.Net.IPEndPoint ([System.Net.IPAddress]::Any, $Port)
$listener = New-Object System.Net.Sockets.TcpListener $endpoint
$listener.Start()

Write-Host "=========================================================="
Write-Host " PARKMATE Mobile Server Active!"
Write-Host " Wi-Fi URL: http://192.168.29.151:$Port"
Write-Host " Local URL: http://localhost:$Port"
Write-Host "=========================================================="

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $line = $reader.ReadLine()
        
        if ($line) {
            $parts = $line.Split(' ')
            if ($parts.Length -ge 2 -and $parts[0] -eq "GET") {
                $rawPath = $parts[1].Split('?')[0].TrimStart('/')
                if ([string]::IsNullOrWhiteSpace($rawPath)) {
                    $rawPath = "index.html"
                }

                $filePath = Join-Path $Path ($rawPath -replace '/', '\')

                if (Test-Path $filePath -PathType Leaf) {
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "text/plain; charset=utf-8" }
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                } else {
                    $body = [System.Text.Encoding]::UTF8.GetBytes("404 File Not Found")
                    $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
                    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                    $stream.Write($headerBytes, 0, $headerBytes.Length)
                    $stream.Write($body, 0, $body.Length)
                }
            }
        }
        $stream.Flush()
        $client.Close()
    }
} finally {
    $listener.Stop()
}
