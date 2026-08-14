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

$ffmpeg = Resolve-FfmpegCommand
$font = ConvertTo-FilterPath (Resolve-FontPath)
$repomark = Resolve-RepomarkCommand
$outputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$mp4 = Join-Path $outputDirectory 'repomark-demo.mp4'
$gif = Join-Path $outputDirectory 'repomark-demo.gif'
$tempDirectory = Join-Path ([IO.Path]::GetTempPath()) ('repomark-demo-' + [Guid]::NewGuid().ToString('N'))

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $tempDirectory | Out-Null

try {
  Push-Location $repomark.Root
  $terminalOutput = (& node $repomark.Cli . --format terminal --no-color | Out-String).TrimEnd()
  if ($LASTEXITCODE -ne 0) { throw "repomark demo command failed with exit code $LASTEXITCODE." }
  $terminalLines = @($terminalOutput -split "`r?`n" | Where-Object { $_.Trim().Length -gt 0 })
  $displayLines = @(
    @{ Name = 'command'; Text = 'PS> repomark . --format terminal --no-color'; Start = 0.8; End = 2.3; Size = 30; Color = 'white'; Y = 130 }
  )
  $lineY = 190
  foreach ($terminalLine in $terminalLines) {
    if ($lineY -gt 590) { break }
    $displayLines += @{ Name = ('output-' + $displayLines.Count); Text = $terminalLine; Start = 1.6; End = 10.0; Size = 21; Color = '0x9aa7bd'; Y = $lineY }
    $lineY += 34
  }
  $displayLines += @{ Name = 'cta'; Text = 'Local. Deterministic. Evidence-first.'; Start = 8.3; End = 10.0; Size = 27; Color = '0x72d6ff'; Y = 645 }

  $lines = $displayLines

  $filters = @(
    'drawbox=x=58:y=55:w=1164:h=610:color=0x17233b@1:t=2',
    'drawbox=x=58:y=55:w=1164:h=72:color=0x111a2b@1:t=fill',
    "drawtext=fontfile='$font':text='REPOMARK / DEMO':fontcolor=0x72d6ff:fontsize=22:x=82:y=78"
  )
  foreach ($line in $lines) {
    $textFile = Join-Path $tempDirectory ($line.Name + '.txt')
    [IO.File]::WriteAllText($textFile, $line.Text, [Text.UTF8Encoding]::new($false))
    $filterTextFile = ConvertTo-FilterPath $textFile
    $filters += "drawtext=fontfile='$font':textfile='$filterTextFile':fontcolor=$($line.Color):fontsize=$($line.Size):x=92:y=$($line.Y):enable='between(t,$($line.Start),$($line.End))'"
  }
  $filter = ($filters -join ',')

  $mp4Args = @(
    '-y', '-f', 'lavfi', '-i', 'color=c=0x0b1020:s=1280x720:r=30:d=10',
    '-vf', $filter, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', $mp4
  )
  & $ffmpeg @mp4Args
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg MP4 generation failed with exit code $LASTEXITCODE." }

  $palette = Join-Path $tempDirectory 'palette.png'
  $paletteArgs = @('-y', '-i', $mp4, '-vf', 'fps=10,scale=640:360:flags=lanczos,palettegen=stats_mode=diff', $palette)
  & $ffmpeg @paletteArgs
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg GIF palette generation failed with exit code $LASTEXITCODE." }
  $gifArgs = @('-y', '-i', $mp4, '-i', $palette, '-lavfi', 'fps=10,scale=640:360:flags=lanczos [x]; [x][1:v] paletteuse=dither=sierra2_4a', $gif)
  & $ffmpeg @gifArgs
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg GIF generation failed with exit code $LASTEXITCODE." }

  Write-Host "Created $mp4"
  Write-Host "Created $gif"
}
finally {
  if ((Get-Location).Path -eq $repomark.Root) { Pop-Location }
  if (Test-Path -LiteralPath $tempDirectory) {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force
  }
}
