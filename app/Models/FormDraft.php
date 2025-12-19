<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FormDraft extends Model
{
    use HasFactory;

    protected $fillable = [
        'travel_case_id',
        'public_token',
        'form_data',
        'expires_at',
    ];

    protected $casts = [
        'form_data' => 'array',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function travelCase(): BelongsTo
    {
        return $this->belongsTo(TravelCase::class);
    }
}
