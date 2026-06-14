# Generate icons from SVG
# Run this script to create PNG and ICO files

$svgPath = "src-tauri\icons\icon.svg"
$outputDir = "src-tauri\icons"

# Check if magick (ImageMagick) is available
if (Get-Command magick -ErrorAction SilentlyContinue) {
    Write-Host "Using ImageMagick to convert SVG..."
    
    # Generate PNGs
    magick convert $svgPath -resize 32x32 "$outputDir\32x32.png"
    magick convert $svgPath -resize 128x128 "$outputDir\128x128.png"
    magick convert $svgPath -resize 256x256 "$outputDir\128x128@2x.png"
    
    # Generate ICO
    magick convert $svgPath -resize 256x256 "$outputDir\icon.ico"
    
    Write-Host "Icons generated successfully!"
} elseif (Get-Command convert -ErrorAction SilentlyContinue) {
    Write-Host "Using ImageMagick (convert) to convert SVG..."
    
    # Generate PNGs
    convert $svgPath -resize 32x32 "$outputDir\32x32.png"
    convert $svgPath -resize 128x128 "$outputDir\128x128.png"
    convert $svgPath -resize 256x256 "$outputDir\128x128@2x.png"
    
    # Generate ICO
    convert $svgPath -resize 256x256 "$outputDir\icon.ico"
    
    Write-Host "Icons generated successfully!"
} else {
    Write-Host "ImageMagick not found. Please install it or manually convert SVG to PNG/ICO."
    Write-Host "Download: https://imagemagick.org/script/download.php"
    Write-Host ""
    Write-Host "Manual steps:"
    Write-Host "1. Open icon.svg in a browser"
    Write-Host "2. Take screenshots at 32x32, 128x128, 256x256"
    Write-Host "3. Save as PNG files in src-tauri/icons/"
    Write-Host "4. Convert 256x256 PNG to ICO using an online tool"
}
