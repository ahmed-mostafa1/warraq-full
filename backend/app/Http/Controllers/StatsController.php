<?php

namespace App\Http\Controllers;

use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class StatsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $bypassCache = $request->has('cache') && (string) $request->query('cache') === '0';
        $ttl = config('stats.ttl', 30);
        $cacheKey = 'stats.summary';

        $stats = $bypassCache
            ? $this->buildStats()
            : Cache::remember($cacheKey, $ttl, fn () => $this->buildStats());

        return response()->json($stats);
    }

    /**
     * Build the statistics payload.
     */
    protected function buildStats(): array
    {
        $total = Member::count();

        $byGender = $this->genderBreakdown();
        $byUnit = $this->groupedBreakdown('unit');
        $byMembershipType = $this->groupedBreakdown('membership_type');
        $ageBuckets = $this->ageBuckets();

        return [
            'total' => $total,
            'byGender' => $byGender,
            'byUnit' => $byUnit,
            'byMembershipType' => $byMembershipType,
            'ageBuckets' => $ageBuckets,
        ];
    }

    protected function genderBreakdown(): array
    {
        $counts = [
            'male' => 0,
            'female' => 0,
            'unspecified' => 0,
        ];

        Member::query()
            ->selectRaw('gender, COUNT(*) as count')
            ->groupBy('gender')
            ->get()
            ->each(function ($row) use (&$counts): void {
                $key = $this->normalizeGenderKeyUpdated($row->gender);
                $counts[$key] += (int) $row->count;
            });

        return [
            ['key' => 'male', 'count' => $counts['male']],
            ['key' => 'female', 'count' => $counts['female']],
            ['key' => 'unspecified', 'count' => $counts['unspecified']],
        ];
    }

    protected function normalizeGenderKeyUpdated(mixed $value): string
    {
        if ($value === null) {
            return 'unspecified';
        }

        $normalized = mb_strtolower(trim((string) $value));

        return match ($normalized) {
            'male', 'm', 'ذكر', 'Ø°ÙƒØ±', 'Ø°' => 'male',
            'female', 'f', 'أنثى', 'Ø£Ù†Ø«Ù‰', 'Ø§Ù†Ø«Ù‰', 'Ø£', 'Ø§' => 'female',
            default => 'unspecified',
        };
    }
 
    protected function groupedBreakdown(string $column): array
    {
        $expression = "CASE WHEN $column IS NULL OR TRIM($column) = '' THEN 'unspecified' ELSE $column END";

        $rows = Member::query()
            ->selectRaw("$expression as key, COUNT(*) as count")
            ->groupByRaw($expression)
            ->orderByDesc('count')
            ->orderBy('key')
            ->limit(10)
            ->get();

        return $rows->map(fn ($row) => [
            'key' => (string) $row->key,
            'count' => (int) $row->count,
        ])->toArray();
    }

    protected function ageBuckets(): array
    {
        $connection = app('db')->connection();
        $driver = $connection->getDriverName();

        if ($driver === 'mysql' || $driver === 'mariadb') {
            $ageExpression = 'TIMESTAMPDIFF(YEAR, dob, CURDATE())';
        } elseif ($driver === 'pgsql') {
            $ageExpression = "DATE_PART('year', AGE(dob))";
        } elseif ($driver === 'sqlite') {
            // Calculate age in full years without relying on non-standard math functions
            $ageExpression = "(CAST(strftime('%Y','now') AS INTEGER) - CAST(strftime('%Y', dob) AS INTEGER) - (strftime('%m-%d','now') < strftime('%m-%d', dob)))";
        } else {
            // Fallback that avoids FLOOR() for engines without math extensions
            $ageExpression = "CAST(((julianday('now') - julianday(dob)) / 365.2425) AS INTEGER)";
        }

        $row = Member::query()
            ->selectRaw("
                SUM(CASE WHEN dob IS NOT NULL AND $ageExpression < 25 THEN 1 ELSE 0 END) as under_25,
                SUM(CASE WHEN dob IS NOT NULL AND $ageExpression >= 25 AND $ageExpression < 35 THEN 1 ELSE 0 END) as between_25_34,
                SUM(CASE WHEN dob IS NOT NULL AND $ageExpression >= 35 AND $ageExpression < 45 THEN 1 ELSE 0 END) as between_35_44,
                SUM(CASE WHEN dob IS NOT NULL AND $ageExpression >= 45 AND $ageExpression < 55 THEN 1 ELSE 0 END) as between_45_54,
                SUM(CASE WHEN dob IS NOT NULL AND $ageExpression >= 55 THEN 1 ELSE 0 END) as over_55
            ")
            ->first();

        return [
            ['bucket' => '<25', 'count' => (int) ($row->under_25 ?? 0)],
            ['bucket' => '25-34', 'count' => (int) ($row->between_25_34 ?? 0)],
            ['bucket' => '35-44', 'count' => (int) ($row->between_35_44 ?? 0)],
            ['bucket' => '45-54', 'count' => (int) ($row->between_45_54 ?? 0)],
            ['bucket' => '55+', 'count' => (int) ($row->over_55 ?? 0)],
        ];
    }

    protected function normalizeGenderKey(mixed $value): string
    {
        if ($value === null) {
            return 'unspecified';
        }

        $normalized = mb_strtolower(trim((string) $value));

        return match ($normalized) {
            'male', 'm', 'ذكر', 'ذ' => 'male',
            'female', 'f', 'أنثى', 'انثى', 'أ', 'ا' => 'female',
            default => 'unspecified',
        };
    }
}
