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

$ffmpeg = Resolve-FfmpegCommand
$font = ConvertTo-FilterPath (Resolve-FontPath)
$outputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
$mp4 = Join-Path $outputDirectory 'repomark-demo.mp4'
$gif = Join-Path $outputDirectory 'repomark-demo.gif'
$tempDirectory = Join-Path ([IO.Path]::GetTempPath()) ('repomark-demo-' + [Guid]::NewGuid().ToString('N'))

New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
New-Item -ItemType Directory -Force -Path $tempDirectory | Out-Null

try {
  $lines = @(
    @{ Name = 'command'; Text = 'PS> repomark .'; Start = 0.8; End = 2.3; Size = 30; Color = 'white'; Y = 130 },
    @{ Name = 'scan'; Text = 'Scanning local files and Git metadata...'; Start = 1.6; End = 3.0; Size = 24; Color = '0x9aa7bd'; Y = 190 },
    @{ Name = 'score'; Text = 'Score: 90/100   Grade: A'; Start = 2.7; End = 10.0; Size = 43; Color = '0x72f1b8'; Y = 270 },
    @{ Name = 'pass'; Text = 'PASS  README 15/15    License 10/10    CI 15/15'; Start = 3.6; End = 10.0; Size = 23; Color = 'white'; Y = 350 },
    @{ Name = 'evidence'; Text = 'Evidence: README.md, LICENSE, .gitignore, test/core.test.ts'; Start = 4.35; End = 10.0; Size = 21; Color = '0x9aa7bd'; Y = 395 },
    @{ Name = 'source'; Text = 'Source: src/args.ts, src/main.ts, src/scoring/...'; Start = 5.0; End = 10.0; Size = 21; Color = '0x9aa7bd'; Y = 435 },
    @{ Name = 'formats'; Text = 'Formats: terminal | json | html | markdown | badge'; Start = 5.65; End = 10.0; Size = 21; Color = '0x72d6ff'; Y = 475 },
    @{ Name = 'finding'; Text = '[LOW] Recent Git activity is missing or stale.'; Start = 6.55; End = 10.0; Size = 24; Color = '0xffc857'; Y = 525 },
    @{ Name = 'action'; Text = 'Action: Make a recent commit in this repository.'; Start = 7.1; End = 10.0; Size = 21; Color = '0xffdca8'; Y = 565 },
    @{ Name = 'cta'; Text = 'Local. Deterministic. Evidence-first.'; Start = 8.3; End = 10.0; Size = 27; Color = '0x72d6ff'; Y = 645 }
  )

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
  if (Test-Path -LiteralPath $tempDirectory) {
    Remove-Item -LiteralPath $tempDirectory -Recurse -Force
  }
}
