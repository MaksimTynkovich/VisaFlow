<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class VisaType extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'code',
        'name',
        'country',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function formTemplates()
    {
        return $this->hasMany(FormTemplate::class);
    }

    public function travelCases()
    {
        return $this->hasMany(TravelCase::class);
    }
}

