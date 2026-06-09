Add-Type -AssemblyName System.IO.Compression.FileSystem
try {
    $docxPath = "C:\Users\user\OneDrive\documentation for complaint management system.docx"
    $outPath = "c:\Users\user\OneDrive\Desktop\New folder (3)\documentation.txt"

    if (-not (Test-Path $docxPath)) {
        Write-Error "Docx file not found at $docxPath"
        exit 1
    }

    $zip = [System.IO.Compression.ZipFile]::OpenRead($docxPath)
    $entry = $zip.GetEntry("word/document.xml")
    if ($null -eq $entry) {
        Write-Error "Invalid docx structure: word/document.xml not found."
        $zip.Dispose()
        exit 1
    }

    $stream = $entry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    $xmlText = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    $zip.Dispose()

    $xml = [xml]$xmlText
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

    $paragraphs = $xml.SelectNodes("//w:p", $ns)
    $textList = New-Object System.Collections.Generic.List[string]

    foreach ($p in $paragraphs) {
        $tNodes = $p.SelectNodes(".//w:t", $ns)
        $pText = ""
        if ($null -ne $tNodes) {
            foreach ($t in $tNodes) {
                $pText += $t.InnerText
            }
        }
        $textList.Add($pText)
    }

    $fullText = [string]::Join("`r`n", $textList)
    [System.IO.File]::WriteAllText($outPath, $fullText, [System.Text.Encoding]::UTF8)
    Write-Output "Successfully extracted docx contents to $outPath"
} catch {
    Write-Error "An error occurred: $_"
}
