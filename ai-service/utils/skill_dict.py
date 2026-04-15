# utils/skill_dict.py
# Comprehensive skill dictionary organized by domain

SKILL_DICT = {
    # ── Programming Languages ──────────────────────────────────────────────
    "languages": [
        "python", "java", "javascript", "typescript", "c", "c++", "c#",
        "go", "golang", "rust", "swift", "kotlin", "ruby", "php", "scala",
        "r", "matlab", "perl", "bash", "shell", "powershell", "dart",
        "haskell", "elixir", "erlang", "clojure", "groovy", "lua",
    ],

    # ── Web & Frontend ─────────────────────────────────────────────────────
    "web_frontend": [
        "html", "css", "react", "reactjs", "react.js", "angular", "angularjs",
        "vue", "vuejs", "vue.js", "nextjs", "next.js", "nuxt", "svelte",
        "tailwind", "bootstrap", "sass", "less", "webpack", "vite",
        "jquery", "redux", "graphql", "rest", "restful", "api",
    ],

    # ── Backend & Frameworks ───────────────────────────────────────────────
    "backend": [
        "node", "nodejs", "node.js", "express", "expressjs", "django",
        "flask", "fastapi", "spring", "springboot", "spring boot",
        "laravel", "rails", "ruby on rails", "asp.net", "dotnet", ".net",
        "nestjs", "fastify", "fiber", "gin", "echo",
    ],

    # ── Databases ──────────────────────────────────────────────────────────
    "databases": [
        "sql", "mysql", "postgresql", "postgres", "sqlite", "oracle",
        "mongodb", "mongo", "redis", "cassandra", "dynamodb", "firebase",
        "elasticsearch", "neo4j", "mariadb", "mssql", "nosql",
        "supabase", "planetscale",
    ],

    # ── Machine Learning & AI ──────────────────────────────────────────────
    "ml_ai": [
        "machine learning", "deep learning", "neural network", "nlp",
        "natural language processing", "computer vision", "cv",
        "tensorflow", "pytorch", "keras", "scikit-learn", "sklearn",
        "xgboost", "lightgbm", "catboost", "huggingface", "transformers",
        "bert", "gpt", "llm", "reinforcement learning", "regression",
        "classification", "clustering", "random forest", "svm",
        "feature engineering", "model deployment", "mlops",
        "pandas", "numpy", "matplotlib", "seaborn", "scipy",
    ],

    # ── Data Engineering & Analytics ───────────────────────────────────────
    "data": [
        "data analysis", "data science", "data engineering", "etl",
        "apache spark", "spark", "hadoop", "kafka", "airflow",
        "tableau", "power bi", "looker", "dbt", "data warehouse",
        "snowflake", "bigquery", "redshift", "databricks",
        "data visualization", "statistics", "a/b testing",
    ],

    # ── Cloud & DevOps ─────────────────────────────────────────────────────
    "cloud_devops": [
        "aws", "amazon web services", "azure", "gcp", "google cloud",
        "docker", "kubernetes", "k8s", "terraform", "ansible",
        "jenkins", "github actions", "ci/cd", "devops", "gitlab",
        "nginx", "linux", "unix", "microservices", "serverless",
        "lambda", "ec2", "s3", "cloudformation", "helm",
    ],

    # ── Mobile ─────────────────────────────────────────────────────────────
    "mobile": [
        "android", "ios", "react native", "flutter", "xamarin",
        "swift", "kotlin", "objective-c", "ionic",
    ],

    # ── Tools & Practices ──────────────────────────────────────────────────
    "tools": [
        "git", "github", "gitlab", "bitbucket", "jira", "confluence",
        "agile", "scrum", "kanban", "tdd", "bdd", "unit testing",
        "selenium", "cypress", "jest", "pytest", "postman",
        "figma", "adobe xd", "linux", "vim",
    ],

    # ── Security ───────────────────────────────────────────────────────────
    "security": [
        "cybersecurity", "penetration testing", "ethical hacking",
        "network security", "cryptography", "owasp", "siem",
        "vulnerability assessment", "soc",
    ],

    # ── Soft Skills (optional matching) ────────────────────────────────────
    "soft_skills": [
        "communication", "leadership", "teamwork", "problem solving",
        "critical thinking", "project management", "time management",
        "collaboration", "adaptability",
    ],
}

# Flat list for fast lookup
ALL_SKILLS: list[str] = []
for category_skills in SKILL_DICT.values():
    ALL_SKILLS.extend(category_skills)

# Remove duplicates while preserving order
seen = set()
ALL_SKILLS_UNIQUE: list[str] = []
for skill in ALL_SKILLS:
    if skill not in seen:
        seen.add(skill)
        ALL_SKILLS_UNIQUE.append(skill)

# Alias / normalization map  (alias → canonical)
SKILL_ALIASES: dict[str, str] = {
    "react.js": "react",
    "reactjs": "react",
    "vue.js": "vuejs",
    "node.js": "nodejs",
    "next.js": "nextjs",
    "sklearn": "scikit-learn",
    "postgres": "postgresql",
    "mongo": "mongodb",
    "k8s": "kubernetes",
    "gcp": "google cloud",
    "golang": "go",
    "spring boot": "springboot",
    "ruby on rails": "rails",
    ".net": "dotnet",
    "cv": "computer vision",
    "nlp": "natural language processing",
}


def normalize_skill(skill: str) -> str:
    """Return canonical form of a skill string."""
    skill = skill.lower().strip()
    return SKILL_ALIASES.get(skill, skill)