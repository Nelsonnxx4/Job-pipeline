// app/api/resume/route.js
// Downloads one of your 3 CVs: /api/resume?cv=frontend_engineer
// Only the three known names work, so no other file can be requested.

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FILES = {
	frontend_engineer: "Nelson_Orhembetyoga_Frontend_Developer_Resume.pdf",
	fullstack_engineer: "Nelson_Orhembetyoga_Full_Stack_Developer_Resume.pdf",
	web_developer: "Nelson_Orhembetyoga_Web_Developer_Resume.pdf",
};

export async function GET(request) {
	const cv = new URL(request.url).searchParams.get("cv") || "frontend_engineer";
	const fileName = FILES[cv];
	if (!fileName) {
		return NextResponse.json({ error: "Unknown CV" }, { status: 400 });
	}

	const filePath = path.join(process.cwd(), "resumes", fileName);
	if (!fs.existsSync(filePath)) {
		return NextResponse.json(
			{ error: "Resume file not found" },
			{ status: 404 },
		);
	}

	const data = fs.readFileSync(filePath);
	return new NextResponse(data, {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="${fileName}"`,
		},
	});
}
