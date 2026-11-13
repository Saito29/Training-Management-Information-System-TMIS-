<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\LocationWorkbook;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;
use ZipArchive;

class LocationImportTest extends TestCase
{
    use RefreshDatabase;

    private function signIn(int $role = 1): User
    {
        $user = User::factory()->create(['role_id' => $role]);
        $passwordHash = Hash::make('Location-import-password-123!');
        DB::table('user_auth')->insert([
            'user_id' => $user->user_id,
            'password_hash' => $passwordHash,
        ]);
        $this->actingAs($user)->withSession([
            'auth.verified_user_id' => $user->user_id,
            'auth.password_fingerprint' => hash('sha256', $passwordHash),
        ]);

        return $user;
    }

    /** @param list<list<string>> $rows */
    private function workbook(array $rows): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'tmis-location-');
        $zip = new ZipArchive;
        $opened = $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $this->assertSame(true, $opened === true);

        $sheetRows = [];
        foreach ($rows as $rowIndex => $row) {
            $cells = '';
            foreach ($row as $columnIndex => $value) {
                $column = chr(ord('A') + $columnIndex);
                $reference = $column.($rowIndex + 1);
                $text = htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
                $cells .= '<c r="'.$reference.'" t="inlineStr"><is><t>'.$text.'</t></is></c>';
            }
            $sheetRows[] = '<row r="'.($rowIndex + 1).'">'.$cells.'</row>';
        }

        $zip->addFromString('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
        $zip->addFromString('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
        $zip->addFromString('xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Locations" sheetId="1" r:id="rId1"/></sheets></workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');
        $zip->addFromString('xl/worksheets/sheet1.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'.implode('', $sheetRows).'</sheetData></worksheet>');
        $zip->close();

        $contents = file_get_contents($path);
        unlink($path);

        return UploadedFile::fake()->createWithContent('locations.xlsx', $contents);
    }

    public function test_administrator_can_download_an_xlsx_location_template(): void
    {
        $this->signIn();

        $this->get(route('system.locations.template'))
            ->assertOk()
            ->assertDownload('location-template.xlsx');

        $path = app(LocationWorkbook::class)->createTemplate();
        $archive = new ZipArchive;
        try {
            $this->assertSame(true, $archive->open($path));
            $worksheet = $archive->getFromName('xl/worksheets/sheet1.xml');
            $this->assertIsString($worksheet);
            $this->assertStringContainsString('Municipality / City', $worksheet);
        } finally {
            $archive->close();
            unlink($path);
        }
    }

    public function test_location_import_creates_the_hierarchy_and_skips_existing_paths_on_reimport(): void
    {
        $this->signIn();
        $rows = [
            ['Region', 'Province', 'District', 'Municipality / City', 'Barangay'],
            ['Region IV-A', 'Batangas', 'Batangas 3rd District', 'Tanauan City', 'San Antonio'],
            ['Region IV-A', 'Batangas', 'Batangas 3rd District', 'Tanauan City', 'Darasa'],
        ];

        $this->postJson(route('system.locations.import'), ['file' => $this->workbook($rows)])
            ->assertCreated()
            ->assertJsonPath('createdLocations', 5)
            ->assertJsonPath('existingLocations', 0);

        $this->assertDatabaseHas('region', ['name' => 'Region IV-A']);
        $this->assertDatabaseHas('geographic_locations', ['kind' => 'province', 'name' => 'Batangas', 'parent_id' => null]);
        $this->assertDatabaseHas('geographic_locations', ['kind' => 'barangay', 'name' => 'San Antonio']);
        $this->assertDatabaseHas('geographic_locations', ['kind' => 'barangay', 'name' => 'Darasa']);

        $this->postJson(route('system.locations.import'), ['file' => $this->workbook($rows)])
            ->assertCreated()
            ->assertJsonPath('createdLocations', 0)
            ->assertJsonPath('existingLocations', 5);

        $this->assertSame(5, DB::table('geographic_locations')->count());
    }

    public function test_invalid_location_hierarchy_is_rejected_without_partial_import(): void
    {
        $this->signIn();

        $this->postJson(route('system.locations.import'), [
            'file' => $this->workbook([
                ['Region', 'Province', 'District', 'Municipality / City', 'Barangay'],
                ['North Region', 'New Province', '', 'New Municipality', 'New Barangay'],
            ]),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('file');

        $this->assertDatabaseMissing('region', ['name' => 'North Region']);
        $this->assertDatabaseCount('geographic_locations', 0);
    }

    public function test_non_administrator_cannot_import_locations(): void
    {
        $this->signIn(2);

        $this->postJson(route('system.locations.import'), ['file' => $this->workbook([
            ['Region', 'Province', 'District', 'Municipality / City', 'Barangay'],
            ['North Region', 'New Province', '', '', ''],
        ])])->assertForbidden();

        $this->assertDatabaseMissing('region', ['name' => 'North Region']);
    }
}
