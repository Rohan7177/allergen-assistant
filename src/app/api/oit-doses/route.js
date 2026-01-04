'use server';

import { NextResponse } from 'next/server';
import {
  fetchDoseLogs,
  fetchAllergens,
  createDoseLog,
  updateDoseLog,
  deleteDoseLog,
} from '../../../lib/oitDoseRepository';

function jsonError(message, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function GET() {
  try {
    const [logs, allergens] = await Promise.all([
      fetchDoseLogs(),
      fetchAllergens(),
    ]);

    return NextResponse.json({ logs, allergens }, { status: 200 });
  } catch (error) {
    console.error('Failed to load OIT dose logs:', error);
    return jsonError('Failed to load OIT dose logs.', 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const record = await createDoseLog(body);
    const logs = await fetchDoseLogs();

    return NextResponse.json({ record, logs }, { status: 201 });
  } catch (error) {
    console.error('Failed to create OIT dose log:', error);
    return jsonError(error.message || 'Failed to create OIT dose log.', 400);
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...payload } = body ?? {};

    const numericId = Number.parseInt(id, 10);
    if (!Number.isFinite(numericId)) {
      return jsonError('Dose log id is required for updates.', 400);
    }

    const record = await updateDoseLog(numericId, payload);
    const logs = await fetchDoseLogs();

    return NextResponse.json({ record, logs }, { status: 200 });
  } catch (error) {
    console.error('Failed to update OIT dose log:', error);
    const status = /not found/i.test(error.message ?? '') ? 404 : 400;
    return jsonError(error.message || 'Failed to update OIT dose log.', status);
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { id } = body ?? {};
    const numericId = Number.parseInt(id, 10);

    if (!Number.isFinite(numericId)) {
      return jsonError('Dose log id is required for deletion.', 400);
    }

    await deleteDoseLog(numericId);
    const logs = await fetchDoseLogs();

    return NextResponse.json({ success: true, logs }, { status: 200 });
  } catch (error) {
    console.error('Failed to delete OIT dose log:', error);
    const status = /not found/i.test(error.message ?? '') ? 404 : 400;
    return jsonError(error.message || 'Failed to delete OIT dose log.', status);
  }
}
