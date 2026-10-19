CREATE TABLE users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('teacher','student')),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE TABLE classes (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX classes_teacher_idx ON classes(teacher_id);
CREATE TABLE class_members (
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (class_id,student_id)
);
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  scenario TEXT NOT NULL,
  content_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX tasks_class_idx ON tasks(class_id,status);
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers_json TEXT NOT NULL,
  scores_json TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  feedback_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  UNIQUE (task_id,student_id)
);
CREATE INDEX submissions_task_idx ON submissions(task_id);
CREATE INDEX submissions_student_idx ON submissions(student_id);
