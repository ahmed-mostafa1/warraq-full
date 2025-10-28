<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMemberRequest;
use App\Http\Requests\UpdateMemberRequest;
use App\Models\Member;
use App\Support\MemberFilters;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MemberController extends Controller
{
    /**
     * Display a listing of members.
     */
    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'search',
            'name',
            'national_id',
            'gender',
            'religion',
            'unit',
            'membership_type',
            'job',
            'status',
        ]);

        $query = MemberFilters::apply(Member::query(), $filters)
            ->orderByDesc('id');

        $members = $query->get();

        return response()->json([
            'data' => $members,
            'total' => $members->count(),
        ]);
    }

    /**
     * Store a newly created member.
     */
    public function store(StoreMemberRequest $request): JsonResponse
    {
        $data = $this->transformLocalizedAttributes($request->validated());

        $member = Member::create($data);

        return response()->json($member, 201);
    }

    /**
     * Display the specified member.
     */
    public function show(Member $member): JsonResponse
    {
        return response()->json($member);
    }

    /**
     * Update the specified member.
     */
    public function update(UpdateMemberRequest $request, Member $member): JsonResponse
    {
        $data = $this->transformLocalizedAttributes($request->validated());

        $member->update($data);

        return response()->json($member);
    }

    /**
     * Remove the specified member.
     */
    public function destroy(Member $member): JsonResponse
    {
        $member->delete();

        return response()->json(null, 204);
    }

    protected function transformLocalizedAttributes(array $data): array
    {
        if (array_key_exists('gender', $data) && $data['gender'] !== null) {
            $data['gender'] = match ($data['gender']) {
                'male' => 'ذكر',
                'female' => 'أنثى',
                default => $data['gender'],
            };
        }

        if (array_key_exists('religion', $data) && $data['religion'] !== null) {
            $data['religion'] = match ($data['religion']) {
                'muslim' => 'مسلم',
                'christian' => 'مسيحي',
                default => $data['religion'],
            };
        }

        return $data;
    }
}
