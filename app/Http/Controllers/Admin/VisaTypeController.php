<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreVisaTypeRequest;
use App\Http\Requests\Admin\UpdateVisaTypeRequest;
use App\Http\Resources\Admin\VisaTypeResource;
use App\Models\VisaType;
use App\Services\Admin\VisaTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VisaTypeController extends Controller
{
    public function __construct(
        private readonly VisaTypeService $visaTypeService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['country', 'is_active', 'search', 'per_page']);
        $visaTypes = $this->visaTypeService->list($filters);

        return response()->json([
            'data' => VisaTypeResource::collection($visaTypes->items()),
            'meta' => [
                'current_page' => $visaTypes->currentPage(),
                'last_page' => $visaTypes->lastPage(),
                'per_page' => $visaTypes->perPage(),
                'total' => $visaTypes->total(),
            ],
        ]);
    }

    public function store(StoreVisaTypeRequest $request): JsonResponse
    {
        $visaType = $this->visaTypeService->create($request->validated());

        return response()->json([
            'data' => new VisaTypeResource($visaType),
        ], 201);
    }

    public function show(VisaType $visaType): JsonResponse
    {
        return response()->json([
            'data' => new VisaTypeResource($visaType),
        ]);
    }

    public function update(UpdateVisaTypeRequest $request, VisaType $visaType): JsonResponse
    {
        $visaType = $this->visaTypeService->update($visaType, $request->validated());

        return response()->json([
            'data' => new VisaTypeResource($visaType),
        ]);
    }

    public function destroy(VisaType $visaType): JsonResponse
    {
        $this->visaTypeService->delete($visaType);

        return response()->json([], 204);
    }

    public function active(): JsonResponse
    {
        $visaTypes = $this->visaTypeService->getActive();

        return response()->json([
            'data' => VisaTypeResource::collection($visaTypes),
        ]);
    }
}

