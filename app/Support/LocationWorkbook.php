<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use SimpleXMLElement;
use ZipArchive;

final class LocationWorkbook
{
    private const MAIN_NAMESPACE = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    private const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;

    private const MAX_ROWS = 50000;

    private const HEADERS = ['region', 'province', 'district', 'municipalitycity', 'barangay'];

    private const HEADER_LABELS = ['Region', 'Province', 'District', 'Municipality / City', 'Barangay'];

    public function createTemplate(): string
    {
        if (! class_exists(ZipArchive::class)) {
            throw new \RuntimeException('XLSX support requires the PHP Zip extension.');
        }

        $path = tempnam(sys_get_temp_dir(), 'tmis-location-template-');
        if ($path === false) {
            throw new \RuntimeException('The location template could not be created.');
        }

        $archive = new ZipArchive;
        if ($archive->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            unlink($path);
            throw new \RuntimeException('The location template could not be created.');
        }

        $headers = '';
        foreach (self::HEADER_LABELS as $index => $label) {
            $column = chr(ord('A') + $index);
            $headers .= '<c r="'.$column.'1" t="inlineStr"><is><t>'.htmlspecialchars($label, ENT_XML1 | ENT_QUOTES, 'UTF-8').'</t></is></c>';
        }

        $files = [
            '[Content_Types].xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
            '_rels/.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            'xl/workbook.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Locations" sheetId="1" r:id="rId1"/></sheets></workbook>',
            'xl/_rels/workbook.xml.rels' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
            'xl/worksheets/sheet1.xml' => '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1">'.$headers.'</row></sheetData></worksheet>',
        ];

        try {
            foreach ($files as $name => $contents) {
                if (! $archive->addFromString($name, $contents)) {
                    throw new \RuntimeException('The location template could not be created.');
                }
            }
        } catch (\Throwable $exception) {
            $archive->close();
            unlink($path);
            throw $exception;
        }

        $archive->close();

        return $path;
    }

    /**
     * @return list<array{region: string, province: string, district: string, municipality: string, barangay: string}>
     */
    public function read(UploadedFile $file): array
    {
        if (! class_exists(ZipArchive::class)) {
            throw new \RuntimeException('XLSX support requires the PHP Zip extension.');
        }

        $path = $file->getRealPath();
        if ($path === false) {
            $this->invalidFile('The uploaded workbook could not be read.');
        }

        $archive = new ZipArchive;
        if ($archive->open($path) !== true) {
            $this->invalidFile('Upload a valid Excel .xlsx workbook.');
        }

        try {
            $this->validateArchive($archive);
            $workbook = $this->xml($archive, 'xl/workbook.xml');
            $relationships = $this->xml($archive, 'xl/_rels/workbook.xml.rels');
            $worksheetPath = $this->firstWorksheetPath($workbook, $relationships);
            $sharedStrings = $this->sharedStrings($archive);
            $worksheet = $archive->getFromName($worksheetPath);
            if ($worksheet === false || strlen($worksheet) > self::MAX_ARCHIVE_BYTES || preg_match('/<!DOCTYPE|<!ENTITY/i', $worksheet)) {
                $this->invalidFile('The first worksheet could not be read.');
            }

            return $this->parseWorksheet($worksheet, $sharedStrings);
        } finally {
            $archive->close();
        }
    }

    private function validateArchive(ZipArchive $archive): void
    {
        if ($archive->numFiles > 256) {
            $this->invalidFile('The workbook contains too many internal files.');
        }

        $totalBytes = 0;
        for ($index = 0; $index < $archive->numFiles; $index++) {
            $entry = $archive->statIndex($index);
            if (! is_array($entry)) {
                $this->invalidFile('The workbook contains an unreadable internal file.');
            }
            $name = (string) ($entry['name'] ?? '');
            if (str_starts_with($name, '/') || str_contains($name, '\\') || str_contains($name, '../')) {
                $this->invalidFile('The workbook contains an invalid internal path.');
            }
            $totalBytes += (int) ($entry['size'] ?? 0);
            if ($totalBytes > self::MAX_ARCHIVE_BYTES) {
                $this->invalidFile('The uncompressed workbook is too large to import.');
            }
        }

        if ($archive->locateName('xl/workbook.xml') === false || $archive->locateName('xl/_rels/workbook.xml.rels') === false) {
            $this->invalidFile('Upload a valid Excel .xlsx workbook.');
        }
    }

    private function xml(ZipArchive $archive, string $path): SimpleXMLElement
    {
        $contents = $archive->getFromName($path);
        if ($contents === false || strlen($contents) > 10 * 1024 * 1024 || preg_match('/<!DOCTYPE|<!ENTITY/i', $contents)) {
            $this->invalidFile('The Excel workbook structure is invalid.');
        }

        $document = simplexml_load_string($contents, SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);
        if (! $document) {
            $this->invalidFile('The Excel workbook structure is invalid.');
        }

        return $document;
    }

    private function firstWorksheetPath(SimpleXMLElement $workbook, SimpleXMLElement $relationships): string
    {
        $workbookSheets = $workbook->children(self::MAIN_NAMESPACE)->sheets->children(self::MAIN_NAMESPACE);
        $sheet = $workbookSheets->sheet[0] ?? null;
        if ($sheet === null) {
            $this->invalidFile('The workbook does not contain a worksheet.');
        }

        $relationshipId = (string) $sheet->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];
        $relationshipNamespace = 'http://schemas.openxmlformats.org/package/2006/relationships';
        foreach ($relationships->children($relationshipNamespace)->Relationship as $relationship) {
            $attributes = $relationship->attributes();
            if ((string) ($attributes['Id'] ?? '') !== $relationshipId
                || ! str_ends_with((string) ($attributes['Type'] ?? ''), '/worksheet')) {
                continue;
            }

            $target = ltrim((string) ($attributes['Target'] ?? ''), '/');
            if ($target === '' || str_contains($target, '..') || str_contains($target, '\\')) {
                break;
            }

            $path = str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
            if (preg_match('~^xl/worksheets/[A-Za-z0-9._-]+\.xml$~', $path) === 1) {
                return $path;
            }
        }

        $this->invalidFile('The first worksheet could not be found.');
    }

    /** @return list<string> */
    private function sharedStrings(ZipArchive $archive): array
    {
        if ($archive->locateName('xl/sharedStrings.xml') === false) {
            return [];
        }

        $strings = [];
        $sharedStrings = $this->xml($archive, 'xl/sharedStrings.xml');
        foreach ($sharedStrings->children(self::MAIN_NAMESPACE)->si as $item) {
            $item->registerXPathNamespace('x', self::MAIN_NAMESPACE);
            $texts = $item->xpath('.//x:t');
            $strings[] = implode('', array_map('strval', $texts ?: []));
        }

        return $strings;
    }

    /**
     * @param  list<string>  $sharedStrings
     * @return list<array{region: string, province: string, district: string, municipality: string, barangay: string}>
     */
    private function parseWorksheet(string $contents, array $sharedStrings): array
    {
        $reader = new \XMLReader;
        $previousErrorSetting = libxml_use_internal_errors(true);
        if (! $reader->XML($contents, null, LIBXML_NONET | LIBXML_COMPACT)) {
            libxml_clear_errors();
            libxml_use_internal_errors($previousErrorSetting);
            $this->invalidFile('The first worksheet could not be read.');
        }

        $headerMap = null;
        $locations = [];
        $seenPaths = [];
        $rowCount = 0;
        try {
            while ($reader->read()) {
                if ($reader->nodeType !== \XMLReader::ELEMENT || $reader->localName !== 'row') {
                    continue;
                }

                $rowNumber = max(1, (int) $reader->getAttribute('r'));
                $rowXml = $reader->readOuterXML();
                $row = simplexml_load_string($rowXml, SimpleXMLElement::class, LIBXML_NONET | LIBXML_COMPACT);
                if (! $row) {
                    $this->invalidFile('Worksheet row '.$rowNumber.' is not valid Excel data.');
                }

                $values = $this->rowValues($row, $sharedStrings, $rowNumber);
                if ($headerMap === null) {
                    $headerMap = $this->headerMap($values);

                    continue;
                }

                if (count(array_filter($values, fn (string $value): bool => trim($value) !== '')) === 0) {
                    continue;
                }
                if (++$rowCount > self::MAX_ROWS) {
                    $this->invalidFile('The workbook can contain no more than '.number_format(self::MAX_ROWS).' location rows.');
                }

                $location = [];
                foreach (self::HEADERS as $header) {
                    $location[$header] = trim((string) ($values[$headerMap[$header]] ?? ''));
                }

                $this->validateLocationRow($location, $rowNumber);
                $pathKey = implode('|', array_map(fn (string $value): string => mb_strtolower($value), $location));
                if (isset($seenPaths[$pathKey])) {
                    continue;
                }
                $seenPaths[$pathKey] = true;
                $locations[] = [
                    'region' => $location['region'],
                    'province' => $location['province'],
                    'district' => $location['district'],
                    'municipality' => $location['municipalitycity'],
                    'barangay' => $location['barangay'],
                ];
            }
            if (libxml_get_errors() !== []) {
                $this->invalidFile('The first worksheet contains invalid XML.');
            }
        } finally {
            $reader->close();
            libxml_clear_errors();
            libxml_use_internal_errors($previousErrorSetting);
        }

        if ($headerMap === null) {
            $this->invalidFile('The worksheet is empty. Use the downloadable location template.');
        }
        if ($locations === []) {
            $this->invalidFile('Add at least one location row below the template headings.');
        }

        return $locations;
    }

    /**
     * @param  list<string>  $sharedStrings
     * @return array<int, string>
     */
    private function rowValues(SimpleXMLElement $row, array $sharedStrings, int $rowNumber): array
    {
        $values = [];
        foreach ($row->children(self::MAIN_NAMESPACE)->c as $cell) {
            $attributes = $cell->attributes();
            $reference = (string) ($attributes['r'] ?? '');
            if (preg_match('/^([A-Z]+)\d+$/i', $reference, $matches) !== 1) {
                $this->invalidFile('Worksheet row '.$rowNumber.' contains an invalid cell reference.');
            }
            $column = 0;
            foreach (str_split(strtoupper($matches[1])) as $letter) {
                $column = ($column * 26) + ord($letter) - ord('A') + 1;
            }
            $type = (string) ($attributes['t'] ?? '');
            $parts = $cell->children(self::MAIN_NAMESPACE);
            if (isset($parts->f)) {
                $this->invalidFile('Worksheet row '.$rowNumber.' contains a formula. Replace formulas with plain values.');
            }

            if ($type === 's') {
                $index = (int) $parts->v;
                if (! array_key_exists($index, $sharedStrings)) {
                    $this->invalidFile('Worksheet row '.$rowNumber.' references an invalid text value.');
                }
                $value = $sharedStrings[$index];
            } elseif ($type === 'inlineStr') {
                $inline = $parts->is;
                $inline->registerXPathNamespace('x', self::MAIN_NAMESPACE);
                $texts = $inline->xpath('.//x:t');
                $value = implode('', array_map('strval', $texts ?: []));
            } else {
                $value = (string) $parts->v;
            }

            $values[$column - 1] = trim($value);
        }

        if ($values === []) {
            return [];
        }

        ksort($values);

        return $values;
    }

    /**
     * @param  array<int, string>  $values
     * @return array<string, int>
     */
    private function headerMap(array $values): array
    {
        $headers = [];
        foreach ($values as $column => $value) {
            if (trim($value) === '') {
                continue;
            }
            $headers[$column] = preg_replace('/[^a-z0-9]/', '', mb_strtolower($value)) ?? '';
        }

        if (count($headers) !== count(self::HEADERS) || count(array_unique($headers)) !== count($headers)) {
            $this->invalidFile('Use the downloadable template with these five columns: Region, Province, District, Municipality / City, and Barangay.');
        }

        $map = [];
        foreach (self::HEADERS as $header) {
            $column = array_search($header, $headers, true);
            if ($column === false) {
                $this->invalidFile('Use the downloadable template with these five columns: Region, Province, District, Municipality / City, and Barangay.');
            }
            $map[$header] = (int) $column;
        }

        return $map;
    }

    /** @param array<string, string> $location */
    private function validateLocationRow(array $location, int $rowNumber): void
    {
        if ($location['region'] === '' || $location['province'] === '') {
            $this->invalidFile('Worksheet row '.$rowNumber.' must include both a Region and Province.');
        }
        if (($location['municipalitycity'] !== '' || $location['barangay'] !== '') && $location['district'] === '') {
            $this->invalidFile('Worksheet row '.$rowNumber.' must include a District before its Municipality / City or Barangay.');
        }
        if ($location['barangay'] !== '' && $location['municipalitycity'] === '') {
            $this->invalidFile('Worksheet row '.$rowNumber.' must include a Municipality / City before its Barangay.');
        }
        foreach ($location as $header => $value) {
            $maximumLength = $header === 'region' ? 64 : 150;
            if (mb_strlen($value) > $maximumLength) {
                $this->invalidFile('Worksheet row '.$rowNumber.' has a location name longer than '.$maximumLength.' characters.');
            }
            if (preg_match('/[\x00-\x1F\x7F]/u', $value) === 1) {
                $this->invalidFile('Worksheet row '.$rowNumber.' contains a control character in a location name.');
            }
        }
    }

    private function invalidFile(string $message): never
    {
        throw ValidationException::withMessages(['file' => $message]);
    }
}
