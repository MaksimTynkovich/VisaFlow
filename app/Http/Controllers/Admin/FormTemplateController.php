<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFormTemplateRequest;
use App\Http\Requests\Admin\UpdateFormTemplateRequest;
use App\Http\Resources\Admin\FormTemplateResource;
use App\Models\FormTemplate;
use App\Services\Admin\FormTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FormTemplateController extends Controller
{
    public function __construct(
        private readonly FormTemplateService $formTemplateService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only(['visa_type_id', 'status', 'search', 'per_page']);
        $formTemplates = $this->formTemplateService->list($filters);

        return response()->json([
            'data' => FormTemplateResource::collection($formTemplates->items()),
            'meta' => [
                'current_page' => $formTemplates->currentPage(),
                'last_page' => $formTemplates->lastPage(),
                'per_page' => $formTemplates->perPage(),
                'total' => $formTemplates->total(),
            ],
        ]);
    }

    public function store(StoreFormTemplateRequest $request): JsonResponse
    {
        $formTemplate = $this->formTemplateService->create($request->validated());

        return response()->json([
            'data' => new FormTemplateResource($formTemplate->load(['visaType', 'creator'])),
        ], 201);
    }

    public function show(FormTemplate $formTemplate): JsonResponse
    {
        return response()->json([
            'data' => new FormTemplateResource($formTemplate->load(['visaType', 'creator'])),
        ]);
    }

    public function update(UpdateFormTemplateRequest $request, FormTemplate $formTemplate): JsonResponse
    {
        $formTemplate = $this->formTemplateService->update($formTemplate, $request->validated());

        return response()->json([
            'data' => new FormTemplateResource($formTemplate),
        ]);
    }

    public function destroy(FormTemplate $formTemplate): JsonResponse
    {
        $this->formTemplateService->delete($formTemplate);

        return response()->json([], 204);
    }

    public function active(): JsonResponse
    {
        $formTemplates = $this->formTemplateService->getActive();

        return response()->json([
            'data' => FormTemplateResource::collection($formTemplates),
        ]);
    }
}

