<?php

namespace Database\Factories;

use App\Models\Member;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Member>
 */
class MemberFactory extends Factory
{
    protected $model = Member::class;

    /**
     * Static dataset to keep generated members deterministic and Arabic-friendly.
     *
     * @var array<int, array<string, string>>
     */
    protected static array $people = [
        ['name' => 'محمد الهواري', 'gender' => 'ذكر'],
        ['name' => 'سارة إبراهيم', 'gender' => 'أنثى'],
        ['name' => 'أحمد يوسف', 'gender' => 'ذكر'],
        ['name' => 'ليلى محمود', 'gender' => 'أنثى'],
        ['name' => 'خالد منصور', 'gender' => 'ذكر'],
        ['name' => 'منى حسن', 'gender' => 'أنثى'],
        ['name' => 'طارق علاء', 'gender' => 'ذكر'],
        ['name' => 'أمينة فؤاد', 'gender' => 'أنثى'],
        ['name' => 'هشام كامل', 'gender' => 'ذكر'],
        ['name' => 'نجلاء عبد القادر', 'gender' => 'أنثى'],
    ];

    /**
     * Units used across seed data.
     *
     * @var array<int, string>
     */
    protected static array $units = [
        'وراق الحضر',
        'وراق العرب',
        'جزيرة محمد',
        'طناش',
        'عزبة المفتى',
        'عزبة الخلايفة',
    ];

    /**
     * Membership types referenced by the front-end.
     *
     * @var array<int, string|null>
     */
    protected static array $membershipTypes = [
        'عضو عادي',
        'عضو لجنة',
        'أمين القسم',
        'أمين مساعد',
        'سكرتير التنظيم',
        'سكرتير مساعد',
        'سكرتير وحدة قاعدية',
        'سكرتير مساعد وحدة قاعدية',
        'سكرتير تنظيم وحدة قاعدية',
        'سكرتير عام وحدة قاعدية',
    ];

    /**
     * Sequence counter to keep national IDs unique yet deterministic.
     */
    protected static int $sequence = 0;

    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        $person = self::$people[self::$sequence % count(self::$people)];
        $unit = $this->faker->randomElement(self::$units);
        $membershipType = $this->faker->randomElement(self::$membershipTypes);

        $index = ++self::$sequence;
        // $hasNationalId = $index % 6 !== 0; // leave some members without national IDs
        $nationalId =(string) (29800000002200 + $index);

        return [
            'name' => $person['name'],
            'national_id' => $nationalId,
            'gender' => $person['gender'],
            'dob' => $this->faker->dateTimeBetween('-60 years', '-18 years')->format('Y-m-d'),
            'phone' => '01' . $this->faker->numberBetween(0, 9) . $this->faker->numerify('########'),
            'address' => $this->faker->address(),
            'unit' => $unit,
            'email' => $this->faker->unique()->email(),
            'membership_type' => $membershipType,
            'membership_number' => 'M' . str_pad((string) $index, 5, '0', STR_PAD_LEFT),
            'job' => $this->faker->jobTitle(),
            'religion' => $this->faker->randomElement(['مسلم', 'مسيحي']),
            'photo' => null,
            'status' => $this->faker->randomElement(['active', 'inactive']),
            'financial_support' => $this->faker->boolean(),
            'notes' => $this->faker->optional()->sentence(),
        ];
    }
}