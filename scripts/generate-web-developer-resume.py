"""Generate the ATS-friendly Web Developer resume used by the pipeline.

The PDF uses only standard PDF fonts and a single-column text layout so its
contents remain readable by applicant-tracking systems.
"""

from pathlib import Path


PAGE_WIDTH, PAGE_HEIGHT = 612, 792
LEFT, RIGHT = 48, 564


def escape_pdf(text):
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap(text, width=106):
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if line and len(candidate) > width:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def make_pdf(output_path):
    commands = []
    y = 754

    def line(text, size=9, font="F1", gap=11):
        nonlocal y
        commands.append(f"BT /{font} {size} Tf {LEFT} {y} Td ({escape_pdf(text)}) Tj ET")
        y -= gap

    def section(title):
        nonlocal y
        y -= 3
        line(title, size=10, font="F2", gap=13)

    def wrapped(text, indent="", width=106, gap=10):
        for item in wrap(text, width):
            line(f"{indent}{item}", size=8.7, gap=gap)

    line("NELSON ORHEMBETYOGA", size=18, font="F2", gap=20)
    line("Web Developer", size=11, font="F2", gap=15)
    line(
        "Nigeria | +234 706 322 1942 | oonelsoncodes@gmail.com | linkedin.com/in/nelsonnxx4 | github.com/Nelsonnxx4",
        size=8.3,
        gap=14,
    )

    section("PROFESSIONAL SUMMARY")
    wrapped(
        "Web Developer with 3+ years of experience building responsive, production web applications. "
        "Skilled in React, TypeScript, Next.js, Vue.js, HTML, CSS, Tailwind CSS, Node.js, REST APIs, "
        "authentication, payments, testing, and database-backed user experiences.",
        width=112,
    )

    section("TECHNICAL SKILLS")
    wrapped(
        "Frontend: React, Next.js, Vue.js, JavaScript (ES6+), TypeScript, HTML5, CSS3, Sass, Tailwind CSS, "
        "Redux Toolkit, TanStack Query, Responsive Design, UI/UX Principles.",
        width=112,
    )
    wrapped(
        "Backend and Data: Node.js, Express.js, REST APIs, GraphQL, Prisma, PostgreSQL, MongoDB, Redis, "
        "Supabase, Firebase, Authentication, Payment Processing.",
        width=112,
    )
    wrapped(
        "Testing and Tools: Vitest, Jest, React Testing Library, Supertest, Git, Docker, Vite, Webpack, ESLint.",
        width=112,
    )

    section("EXPERIENCE")
    line("NITDA Nigeria | Abuja, Nigeria", size=9, font="F2", gap=11)
    line("Software Engineer Intern | June 2026 - Present", size=8.7, font="F4", gap=11)
    wrapped(
        "- Selected for a technical acceleration program covering Python development, product design, data science, and embedded systems.",
        width=110,
    )
    wrapped(
        "- Build backend scripts and application logic with Python while developing full-stack web application skills.",
        width=110,
    )
    wrapped(
        "- Apply UI/UX principles to wireframes and user-centered interface layouts in product design workflows.",
        width=110,
    )

    section("WEB DEVELOPMENT PROJECTS")
    line("MealMatch - Food Recommendation Web App | React, TypeScript, Tailwind CSS, Supabase, Paystack", size=8.7, font="F2", gap=10)
    wrapped(
        "- Built a responsive web application that provides personalized food recommendations; implemented Supabase authentication and PostgreSQL data storage.",
        width=110,
    )
    wrapped(
        "- Managed server state with TanStack Query, integrated Paystack premium payments, and tested components with Vitest and React Testing Library.",
        width=110,
    )
    line("Zende - Travel Journal Web App | Vue.js, TypeScript, Tailwind CSS, Supabase, Stripe", size=8.7, font="F2", gap=10)
    wrapped(
        "- Developed a responsive travel-journal interface with Vue.js and TypeScript; implemented authentication, data storage, and premium features with Stripe.",
        width=110,
    )
    line("Not-lify - Full-Stack Notes App | React, TypeScript, Express, Prisma, PostgreSQL, Redis", size=8.7, font="F2", gap=10)
    wrapped(
        "- Built and deployed a notes application with an Express REST API, React frontend, PostgreSQL via Prisma, and autosaving, search, tags, folders, and favorites.",
        width=110,
    )
    wrapped(
        "- Implemented JWT and Google OAuth authentication, Zod request validation, and a Redis-backed token blacklist for protected routes.",
        width=110,
    )
    line("URL Shortener - Backend Service | Node.js, Express.js, TypeScript, Redis, Supertest", size=8.7, font="F2", gap=10)
    wrapped(
        "- Built and tested a REST API for shortening and redirecting URLs; used Redis caching to improve redirect lookups.",
        width=110,
    )

    section("EDUCATION")
    line("Benue State University | Bachelor of Science in Computer Science | April 2024 - Present | Makurdi, Nigeria", size=8.7, gap=10)

    stream = "\n".join(commands).encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R /F2 6 0 R /F4 7 0 R >> >> /Contents 4 0 R >>",
        b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>",
        b"<< /Title (Nelson Orhembetyoga - Web Developer Resume) /Author (Nelson Orhembetyoga) /Subject (Web Developer Resume) >>",
    ]

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")
    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R /Info 8 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii")
    )
    output_path.write_bytes(pdf)


if __name__ == "__main__":
    make_pdf(Path(__file__).resolve().parents[1] / "resumes" / "Nelson_Orhembetyoga_Web_Developer_Resume.pdf")
