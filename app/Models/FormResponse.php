<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FormResponse extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'travel_case_id',
        'payload',
        'submitted_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'submitted_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function travelCase(): BelongsTo
    {
        return $this->belongsTo(TravelCase::class);
    }
}


