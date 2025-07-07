CREATE TABLE IF NOT EXISTS settings_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    docker_tls_cert TEXT NOT NULL DEFAULT '',
    stacks_directory TEXT NOT NULL,
    auto_update BOOLEAN NOT NULL DEFAULT 0,
    auto_update_interval INTEGER NOT NULL DEFAULT 300,
    polling_enabled BOOLEAN NOT NULL DEFAULT 1,
    polling_interval INTEGER NOT NULL DEFAULT 5,
    prune_mode TEXT,
    registry_credentials TEXT NOT NULL DEFAULT '[]',
    template_registries TEXT NOT NULL DEFAULT '[]',
    auth TEXT NOT NULL,
    onboarding TEXT,
    base_server_url TEXT,
    maturity_threshold_days INTEGER NOT NULL DEFAULT 30,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS users_table (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    display_name TEXT,
    email TEXT,
    roles TEXT NOT NULL DEFAULT '[]',
    require_password_change BOOLEAN NOT NULL DEFAULT 0,
    oidc_subject_id TEXT,
    last_login DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS user_sessions_table (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users_table(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stacks_table (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dir_name TEXT UNIQUE,
    path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    service_count INTEGER NOT NULL DEFAULT 0,
    running_count INTEGER NOT NULL DEFAULT 0,
    auto_update BOOLEAN NOT NULL DEFAULT 0,
    is_external BOOLEAN NOT NULL DEFAULT 0,
    is_legacy BOOLEAN NOT NULL DEFAULT 0,
    is_remote BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS environments (
    id TEXT PRIMARY KEY,
    hostname TEXT NOT NULL,
    api_url TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'offline',
    enabled BOOLEAN NOT NULL DEFAULT 1,
    last_seen DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS containers_table (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image TEXT NOT NULL,
    status TEXT NOT NULL,
    state TEXT NOT NULL,
    ports TEXT,
    mounts TEXT,
    networks TEXT,
    labels TEXT,
    environment TEXT,
    command TEXT,
    stack_id TEXT,
    started_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (stack_id) REFERENCES stacks_table(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS images_table (
    id TEXT PRIMARY KEY,
    repo_tags TEXT,
    repo_digests TEXT,
    size INTEGER NOT NULL DEFAULT 0,
    virtual_size INTEGER NOT NULL DEFAULT 0,
    labels TEXT,
    created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    repo TEXT NOT NULL DEFAULT '',
    tag TEXT NOT NULL DEFAULT '',
    in_use BOOLEAN NOT NULL DEFAULT 0,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS volumes_table (
    name TEXT PRIMARY KEY,
    driver TEXT NOT NULL,
    mountpoint TEXT NOT NULL,
    labels TEXT,
    scope TEXT NOT NULL,
    options TEXT,
    in_use BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS networks_table (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    driver TEXT NOT NULL,
    scope TEXT NOT NULL,
    internal BOOLEAN NOT NULL DEFAULT 0,
    attachable BOOLEAN NOT NULL DEFAULT 0,
    ingress BOOLEAN NOT NULL DEFAULT 0,
    ipam TEXT,
    labels TEXT,
    options TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS image_maturity_table (
    id TEXT PRIMARY KEY,
    repository TEXT NOT NULL,
    tag TEXT NOT NULL,
    current_version TEXT NOT NULL DEFAULT '',
    latest_version TEXT,
    status TEXT NOT NULL,
    updates_available BOOLEAN NOT NULL DEFAULT 0,
    current_image_date DATETIME,
    latest_image_date DATETIME,
    days_since_creation INTEGER,
    registry_domain TEXT,
    is_private_registry BOOLEAN NOT NULL DEFAULT 0,
    last_checked DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    response_time_ms INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (id) REFERENCES images_table(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS template_registries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    description TEXT NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compose_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    env_content TEXT,
    is_custom BOOLEAN NOT NULL DEFAULT 1,
    is_remote BOOLEAN NOT NULL DEFAULT 0,
    registry_id TEXT,
    meta_version TEXT,
    meta_author TEXT,
    meta_tags TEXT,
    meta_remote_url TEXT,
    meta_env_url TEXT,
    meta_documentation_url TEXT,
    meta_icon_url TEXT,
    meta_updated_at TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (registry_id) REFERENCES template_registries(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS container_registries (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    username TEXT NOT NULL,
    token TEXT NOT NULL,
    description TEXT,
    insecure BOOLEAN NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users_table(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions_table(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions_table(token);
CREATE INDEX IF NOT EXISTS idx_containers_stack_id ON containers_table(stack_id);
CREATE INDEX IF NOT EXISTS idx_containers_name ON containers_table(name);
CREATE INDEX IF NOT EXISTS idx_containers_image ON containers_table(image);
CREATE INDEX IF NOT EXISTS idx_containers_status ON containers_table(status);
CREATE INDEX IF NOT EXISTS idx_containers_state ON containers_table(state);
CREATE INDEX IF NOT EXISTS idx_images_repo ON images_table(repo);
CREATE INDEX IF NOT EXISTS idx_images_tag ON images_table(tag);
CREATE INDEX IF NOT EXISTS idx_images_in_use ON images_table(in_use);
CREATE INDEX IF NOT EXISTS idx_stacks_name ON stacks_table(name);
CREATE INDEX IF NOT EXISTS idx_stacks_status ON stacks_table(status);
CREATE INDEX IF NOT EXISTS idx_image_maturity_repository ON image_maturity_table(repository);
CREATE INDEX IF NOT EXISTS idx_image_maturity_tag ON image_maturity_table(tag);
CREATE INDEX IF NOT EXISTS idx_image_maturity_status ON image_maturity_table(status);