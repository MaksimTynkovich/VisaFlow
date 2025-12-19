<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTravelCaseRequest;
use App\Http\Requests\Admin\UpdateTravelCaseRequest;
use App\Http\Resources\Admin\TravelCaseResource;
use App\Models\TravelCase;
use App\Services\Admin\TravelCaseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TravelCaseController extends Controller
{
    public function __construct(
        private readonly TravelCaseService $travelCaseService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'visa_type_id',
            'status',
            'search',
            'date_from',
            'date_to',
            'per_page',
        ]);
        $travelCases = $this->travelCaseService->list($filters);

        return response()->json([
            'data' => TravelCaseResource::collection($travelCases->items()),
            'meta' => [
                'current_page' => $travelCases->currentPage(),
                'last_page' => $travelCases->lastPage(),
                'per_page' => $travelCases->perPage(),
                'total' => $travelCases->total(),
            ],
        ]);
    }

    public function store(StoreTravelCaseRequest $request): JsonResponse
    {
        $travelCase = $this->travelCaseService->create($request->validated());

        return response()->json([
            'data' => new TravelCaseResource($travelCase->load(['visaType', 'formTemplate', 'creator'])),
        ], 201);
    }

    public function show(TravelCase $travelCase): JsonResponse
    {
        return response()->json([
            'data' => new TravelCaseResource(
                $travelCase->load(['visaType', 'formTemplate', 'creator', 'formResponses'])
            ),
        ]);
    }

    public function update(UpdateTravelCaseRequest $request, TravelCase $travelCase): JsonResponse
    {
        $travelCase = $this->travelCaseService->update($travelCase, $request->validated());

        return response()->json([
            'data' => new TravelCaseResource($travelCase),
        ]);
    }

    public function destroy(TravelCase $travelCase): JsonResponse
    {
        $this->travelCaseService->delete($travelCase);

        return response()->json([], 204);
    }
}


