param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\docs')
)

$ErrorActionPreference = 'Stop'

function Resolve-FfmpegCommand {
  $command = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($null -eq $command) {
    throw 'ffmpeg was not found on PATH. Install ffmpeg, then rerun scripts/demo-video.ps1.'
  }
  return $command.Source
}

function Resolve-FontPath {
  $candidates = @(
    (Join-Path $env:WINDIR 'Fonts\CascadiaMono.ttf'),
    (Join-Path $env:WINDIR 'Fonts\Consola.ttf'),
    (Join-Path $env:WINDIR 'Fonts\cour.ttf')
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  throw 'No supported monospace system font found in the Windows Fonts directory.'
}

function ConvertTo-FilterPath([string]$Path) {
  return ($Path.Replace('\', '/').Replace(':', '\:').Replace("'", "\\'"))
}

function Resolve-RepomarkCommand {
  $root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
  $cli = Join-Path $root 'dist\src\cli.js'
  if (-not (Test-Path -LiteralPath $cli)) {
    throw 'dist/src/cli.js was not found. Run npm run build, then rerun scripts/demo-video.ps1.'
  }
  return @{ Root = $root; Cli = $cli }
}

function Limit-DisplayText([string]$Text, [int]$MaxLength = 86) {
  $clean = ($Text -replace '\s+', ' ').Trim()
  if ($clean.Length -le $MaxLength) { return $clean }
  return $clean.Substring(0, $MaxLength - 3) + '...'
}

function New-TextLayer([string]$Name, [string]$Text, [double]$Start, [double]$End, [int]$Size, [string]$Color, [int]$X, [int]$Y) {
  return @{ Name = $Name; Text = (Limit-DisplayText $Text); Start = $Start; End = $End; Size = $Size; Color = $Color; X = $X; Y = $Y }
}

$ffmpeg = Resolve-FfmpegCommand
$font = ConvertTo-FilterPath (Resolve-FontPath)
$repomark = Resolve-RepomarkCommand
$outputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$mp4 = Join-Path $outputDirectory 'repomark-demo.mp4'
$gif = Join-Path $outputDirectory 'repomark-demo.gif'
$tempDirectory = Join-Path ([IO.Path]::GetTempPath()) ('repomark-demo-' + [Guid]::NewGuid().ToString('N'))
$renderedMp4 = Join-Path $tempDirectory 'repomark-demo.mp4'
$renderedGif = Join-Path $tempDirectory 'repomark-demo.gif'
$locationPushed = $false

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

try {
  New-Item -ItemType Directory -Path $tempDirectory | Out-Null
  Push-Location $repomark.Root
  $locationPushed = $true
  $terminalOutput = (& node $repomark.Cli . --format terminal --no-color | Out-String).TrimEnd()
  if ($LASTEXITCODE -ne 0) { throw "repomark demo command failed with exit code $LASTEXITCODE." }

  $terminalLines = @($terminalOutput -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 })
  $scoreLine = $terminalLines | Where-Object { $_ -match '^Score:' } | Select-Object -First 1
  $readinessLine = $terminalLines | Where-Object { $_ -match '^Readiness:' } | Select-Object -First 1
  $checkLines = @($terminalLines | Where-Object { $_ -match '^(PASS|MISS) ' } | Select-Object -First 4)
  $evidenceLines = @($terminalLines | Where-Object { $_ -match '^\s+Evidence:' } | Select-Object -First 3)
  $findingLine = $terminalLines | Where-Object { $_ -match '^\s+(None|Action:)' } | Select-Object -First 1
  $diagnosticLine = $terminalLines | Where-Object { $_ -match '^\s+Files scanned:' } | Select-Object -First 1

  if (-not $scoreLine -or -not $readinessLine) { throw 'repomark output did not contain expected score and readiness lines.' }

  $layers = @(
    (New-TextLayer 'brand' 'REPOMARK  /  LOCAL REPOSITORY INTELLIGENCE' 0.25 2.1 24 '0x75ddff' 92 82),
    (New-TextLayer 'eyebrow' 'EVIDENCE-FIRST READINESS CHECK' 0.55 2.1 15 '0x7389a8' 94 120),
    (New-TextLayer 'command' 'PS> repomark . --format terminal --no-color' 1.65 4.1 27 '0xf2f7ff' 94 188),
    (New-TextLayer 'scan' 'SCANNING LOCAL FILES + GIT METADATA' 2.95 6.1 17 '0x8ba5c7' 94 286),
    (New-TextLayer 'result-label' 'READINESS SIGNAL' 5.25 8.6 16 '0x76a7cf' 94 382),
    (New-TextLayer 'score' (Limit-DisplayText $scoreLine 42) 5.45 8.7 34 '0x75ddff' 94 414),
    (New-TextLayer 'readiness' (Limit-DisplayText $readinessLine 78) 6.25 8.7 18 '0xc6d6ea' 94 465),
    (New-TextLayer 'evidence-label' 'LIVE EVIDENCE  /  SELECTED SIGNALS' 7.55 11.4 16 '0x76a7cf' 94 532),
    (New-TextLayer 'cta' 'Know what your repository can prove.' 11.55 13.0 27 '0xf2f7ff' 94 590),
    (New-TextLayer 'cta-sub' 'OFFLINE  •  DETERMINISTIC  •  EVIDENCE-FIRST' 11.95 13.0 15 '0x75ddff' 94 628)
  )
  $checkIndex = 0
  foreach ($checkLine in $checkLines) {
    $layers += New-TextLayer ('check-' + $checkIndex) $checkLine (7.95 + ($checkIndex * 0.35)) 11.35 18 ($(if ($checkLine -match '^PASS') { '0x9be8cf' } else { '0xffb57a' })) 94 (566 + ($checkIndex * 25))
    $checkIndex++
  }
  $evidenceIndex = 0
  foreach ($evidenceLine in $evidenceLines) {
    $layers += New-TextLayer ('evidence-' + $evidenceIndex) $evidenceLine (8.25 + ($evidenceIndex * 0.35)) 11.35 16 '0x91a9c6' 650 (566 + ($evidenceIndex * 25))
    $evidenceIndex++
  }
  if ($findingLine) { $layers += New-TextLayer 'finding' $findingLine 9.75 11.35 16 '0xd8e7f7' 650 632 }
  if ($diagnosticLine) { $layers += New-TextLayer 'diagnostic' $diagnosticLine 9.75 11.35 15 '0x9bb4d1' 650 657 }

  $filters = @(
    'drawgrid=width=64:height=64:thickness=1:color=0x18304f@0.28',
    'drawbox=x=50:y=44:w=1180:h=632:color=0x193457@0.9:t=2',
    'drawbox=x=52:y=46:w=1176:h=62:color=0x0e1b31@0.95:t=fill',
    'drawbox=x=52:y=108:w=1176:h=2:color=0x2d83bb@0.6:t=fill',
    'drawbox=x=76:y=146:w=1128:h=92:color=0x0d1a2e@0.88:t=fill',
    'drawbox=x=76:y=260:w=1128:h=178:color=0x0d1a2e@0.82:t=fill',
    'drawbox=x=76:y=500:w=1128:h=172:color=0x0d1a2e@0.9:t=fill',
    "drawbox=x=94:y=326:w=980:h=5:color=0x1b4266@0.9:t=fill",
    "drawbox=x=94:y=326:w='min(980,max(0,(t-2.8)*390))':h=5:color=0x62d7ff@0.95:t=fill",
    "drawbox=x=94:y=326:w=18:h=5:color=0xb8f2ff@0.95:t=fill:enable='between(t,2.8,6.1)'"
  )
  foreach ($layer in $layers) {
    $textFile = Join-Path $tempDirectory ($layer.Name + '.txt')
    [IO.File]::WriteAllText($textFile, $layer.Text, [Text.UTF8Encoding]::new($false))
    $filterTextFile = ConvertTo-FilterPath $textFile
    $start = $layer.Start.ToString('0.##', [Globalization.CultureInfo]::InvariantCulture)
    $end = $layer.End.ToString('0.##', [Globalization.CultureInfo]::InvariantCulture)
    $fadeEnd = ($layer.Start + 0.28).ToString('0.##', [Globalization.CultureInfo]::InvariantCulture)
    $fade = "if(lt(t,$start),0,if(lt(t,$fadeEnd),(t-$start)/0.28,1))"
    $filters += "drawtext=fontfile='$font':textfile='$filterTextFile':fontcolor=$($layer.Color):fontsize=$($layer.Size):x=$($layer.X):y=$($layer.Y):alpha='$fade':expansion=none:enable='between(t,$start,$end)'"
  }
  $filter = ($filters -join ',')

  $mp4Args = @(
    '-y', '-f', 'lavfi', '-i', 'color=c=0x071426:s=1280x720:r=30:d=13',
    '-vf', $filter, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', $renderedMp4
  )
  & $ffmpeg @mp4Args
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg MP4 generation failed with exit code $LASTEXITCODE." }

  $palette = Join-Path $tempDirectory 'palette.png'
  $paletteArgs = @('-y', '-i', $renderedMp4, '-vf', 'fps=10,scale=640:360:flags=lanczos,palettegen=stats_mode=diff', $palette)
  & $ffmpeg @paletteArgs
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg GIF palette generation failed with exit code $LASTEXITCODE." }
  $gifArgs = @('-y', '-i', $renderedMp4, '-i', $palette, '-lavfi', 'fps=10,scale=640:360:flags=lanczos [x]; [x][1:v] paletteuse=dither=sierra2_4a', $renderedGif)
  & $ffmpeg @gifArgs
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg GIF generation failed with exit code $LASTEXITCODE." }

  Move-Item -LiteralPath $renderedMp4 -Destination $mp4 -Force
  Move-Item -LiteralPath $renderedGif -Destination $gif -Force
  Write-Host "Created $mp4"
  Write-Host "Created $gif"
}
finally {
  if ($locationPushed) { Pop-Location }
  if (Test-Path -LiteralPath $tempDirectory) {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force -ErrorAction SilentlyContinue
  }
}
