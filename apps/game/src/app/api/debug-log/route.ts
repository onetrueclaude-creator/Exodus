import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

const LOG_PATH = join(process.cwd(), 'debug.log');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const line = `[${new Date().toISOString()}] ${body.label}: ${body.detail}\n`;
    appendFileSync(LOG_PATH, line);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function DELETE() {
  writeFileSync(LOG_PATH, '');
  return NextResponse.json({ ok: true, message: 'Log cleared' });
}
