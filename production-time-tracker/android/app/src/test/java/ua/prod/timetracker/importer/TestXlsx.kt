package ua.prod.timetracker.importer

import java.io.ByteArrayOutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/** Створює мінімальний XLSX (спільні рядки + числа) для тестів. */
object TestXlsx {

    fun build(rows: List<List<Any?>>, sheetName: String = "Лист1"): ByteArray {
        val shared = LinkedHashMap<String, Int>()
        val sheet = StringBuilder()
        sheet.append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""")
        sheet.append("""<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>""")
        rows.forEachIndexed { r, row ->
            sheet.append("""<row r="${r + 1}">""")
            row.forEachIndexed { c, value ->
                val ref = "${'A' + c}${r + 1}"
                when (value) {
                    null -> Unit
                    is Number -> sheet.append("""<c r="$ref"><v>$value</v></c>""")
                    else -> {
                        val idx = shared.getOrPut(value.toString()) { shared.size }
                        sheet.append("""<c r="$ref" t="s"><v>$idx</v></c>""")
                    }
                }
            }
            sheet.append("</row>")
        }
        sheet.append("</sheetData></worksheet>")

        val sst = StringBuilder()
        sst.append("""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>""")
        sst.append("""<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.size}" uniqueCount="${shared.size}">""")
        shared.keys.forEach { sst.append("<si><t>").append(escape(it)).append("</t></si>") }
        sst.append("</sst>")

        val workbook = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="$sheetName" sheetId="1" r:id="rId1"/></sheets></workbook>"""
        val rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>"""

        val out = ByteArrayOutputStream()
        ZipOutputStream(out).use { zip ->
            fun put(name: String, content: String) {
                zip.putNextEntry(ZipEntry(name)); zip.write(content.toByteArray(Charsets.UTF_8)); zip.closeEntry()
            }
            put("[Content_Types].xml", """<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>""")
            put("xl/workbook.xml", workbook)
            put("xl/_rels/workbook.xml.rels", rels)
            put("xl/worksheets/sheet1.xml", sheet.toString())
            put("xl/sharedStrings.xml", sst.toString())
        }
        return out.toByteArray()
    }

    private fun escape(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
}
