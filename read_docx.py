import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = r"C:\Users\user\OneDrive\documentation for complaint management system.docx"
out_path = r"c:\Users\user\OneDrive\Desktop\New folder (3)\documentation.txt"

if not os.path.exists(docx_path):
    print(f"Error: File not found at {docx_path}")
    exit(1)

try:
    with zipfile.ZipFile(docx_path) as docx:
        xml_content = docx.read('word/document.xml')
        root = ET.fromstring(xml_content)
        
        # Docx XML parsing
        # The paragraphs are represented by <w:p> and texts by <w:t>
        # We can iterate through the elements in document order
        paragraphs = []
        for elem in root.iter():
            if elem.tag.endswith('p'):
                # Extract all text elements under this paragraph
                texts = [t_elem.text for t_elem in elem.iter() if t_elem.tag.endswith('t') and t_elem.text]
                if texts:
                    paragraphs.append("".join(texts))
                else:
                    paragraphs.append("")
            
        full_text = "\n".join(paragraphs)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(full_text)
            
        print(f"Successfully extracted text to {out_path}")
except Exception as e:
    print(f"Error reading docx: {e}")
