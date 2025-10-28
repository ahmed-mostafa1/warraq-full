<?php

namespace Tests\Feature;

use App\Exports\MembersExport;
use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Support\Facades\Storage;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MembersImportExportTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_imports_members_from_csv(): void
    {
        Storage::fake('local');

        $existing = Member::factory()->create([
            'national_id' => '12345678901235',
            'status' => 'active',
            'notes' => 'Old note',
            'financial_support' => true,
        ]);

        $csvContent = implode("\n", [
            'name,national_id,gender,dob,phone,address,unit,membership_type,status,financial_support,notes',
            'Ahmed Ali,12345678901234,male,1990-05-05,01012345678,10 Downing Street,Unit A,regular,active,1,First import',
            "Updated Name,{$existing->national_id},female,1988-03-03,01098765432,Updated Address,Unit B,committee,inactive,0,Updated note",
            '',
        ]);

        $file = UploadedFile::fake()->createWithContent('members.csv', $csvContent);

        $response = $this->post('/api/members/import', [
            'file' => $file,
        ]);

        $response->assertOk();
        $response->assertJson([
            'inserted' => 1,
            'updated' => 1,
            'failed' => 0,
        ]);

        $this->assertDatabaseHas('members', [
            'national_id' => '12345678901234',
            'name' => 'Ahmed Ali',
            'status' => 'active',
            'financial_support' => 1,
            'notes' => 'First import',
        ]);

        $this->assertDatabaseHas('members', [
            'id' => $existing->id,
            'name' => 'Updated Name',
            'status' => 'inactive',
            'financial_support' => 0,
            'notes' => 'Updated note',
        ]);
    }

    #[Test]
    public function it_exports_members_as_csv(): void
    {
        Excel::fake();
        Excel::matchByRegex();

        Member::factory()->count(2)->create();

        $response = $this->get('/api/members/export?format=csv');
        $response->assertOk();

        Excel::assertDownloaded('/^members-\d{8}-\d{6}\.csv$/', function ($export): bool {
            return $export instanceof MembersExport
                && $export->getFilters() === [];
        });
    }

    #[Test]
    public function it_passes_filters_to_members_export(): void
    {
        Excel::fake();
        Excel::matchByRegex();

        Member::factory()->count(3)->create();

        $response = $this->get('/api/members/export?format=xlsx&gender=ذكر&job=مهندس');
        $response->assertOk();

        Excel::assertDownloaded('/^members-\d{8}-\d{6}\.xlsx$/', function ($export): bool {
            if (! $export instanceof MembersExport) {
                return false;
            }

            $filters = $export->getFilters();

            return ($filters['gender'] ?? null) === 'ذكر'
                && ($filters['job'] ?? null) === 'مهندس';
        });
    }
}
