<?php

namespace Tests\Feature;

use App\Models\Member;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MembersFiltersTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function it_filters_members_by_multiple_fields(): void
    {
        $matching = Member::factory()->create([
            'name' => 'محمد أحمد',
            'national_id' => '12345678901234',
            'gender' => 'ذكر',
            'religion' => 'مسلم',
            'unit' => 'وحدة الوراق',
            'membership_type' => 'عضو عادي',
            'job' => 'مهندس كهرباء',
        ]);

        Member::factory()->create([
            'name' => 'سارة إبراهيم',
            'national_id' => '98765432109876',
            'gender' => 'أنثى',
            'religion' => 'مسيحي',
            'unit' => 'وحدة أخرى',
            'membership_type' => 'سكرتير التنظيم',
            'job' => 'طبيبة',
        ]);

        $response = $this->getJson('/api/members?name=محمد&national_id=1234&gender=ذكر&religion=مسلم&unit=الوراق&membership_type=عضو عادي&job=مهندس');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonFragment([
            'id' => $matching->id,
            'name' => $matching->name,
            'national_id' => $matching->national_id,
            'gender' => $matching->gender,
            'religion' => $matching->religion,
            'unit' => $matching->unit,
            'membership_type' => $matching->membership_type,
            'job' => $matching->job,
        ]);
    }
}
