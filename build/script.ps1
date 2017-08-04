$tsFolder = "C:\Users\a.cuisinier\Documents\Personnel\leek\src\ts"
$jsFolder = "C:\Users\a.cuisinier\Documents\Personnel\leek\src\js"
$sourceFiles = Get-ChildItem -Path $tsFolder -Filter *.ts -r | % { $_.Name.Replace( ".ts","") }

foreach ($file in $sourceFiles)
{
    $inputName = "$($tsFolder)\$($file).ts"
    $outputName = "$($jsFolder)\$($file).js"

	node $inputName $outputName
}