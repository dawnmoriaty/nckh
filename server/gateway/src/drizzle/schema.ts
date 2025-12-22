import {
  pgTable,
  uuid,
  text,
  timestamp,
  varchar,
  boolean,
  jsonb,
  integer,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ========================================================
// 1. NHÓM QUẢN TRỊ & PHÂN QUYỀN (Auth & RBAC)
// ========================================================

// Bảng Roles: Định danh vai trò (Admin, Giảng viên, Sinh viên)
export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // ADMIN, LECTURER, STUDENT
  code: varchar('code', { length: 20 }).notNull().unique(), // Mã code để check trong code (VD: 'ADMIN')
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bảng Users: Tài khoản hệ thống
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleId: uuid('role_id')
    .references(() => roles.id)
    .notNull(), // Link sang bảng Roles

  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: text('password').notNull(), // Hash bcrypt

  fullName: text('full_name').notNull(),
  phone: varchar('phone', { length: 20 }),
  avatar: text('avatar'), // URL ảnh đại diện

  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Bảng Resources: Danh sách tài nguyên (để phân quyền động)
export const resources = pgTable('resources', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  apiUri: varchar('api_uri', { length: 200 }),
  description: text('description'),
});

// Bảng Permissions: Ma trận phân quyền (Role nào - Làm gì - Ở đâu)
export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleId: uuid('role_id')
    .references(() => roles.id)
    .notNull(),
  resourceId: uuid('resource_id')
    .references(() => resources.id)
    .notNull(),

  // Lưu actions dạng mảng JSONB: ["READ", "CREATE", "IMPORT", "EXPORT"]
  // JSONB giúp query trong Postgres cực nhanh
  actions: jsonb('actions').$type<string[]>().default([]),

  createdAt: timestamp('created_at').defaultNow(),
});

// ========================================================
// 2. NHÓM ĐÀO TẠO & CHỦ ĐỀ (Training Domain)
// ========================================================

// Bảng Topics: Chủ đề luyện tập (VD: Basic Select, JOIN, Subquery)
export const topics = pgTable('topics', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique(), // URL thân thiện: /practice/basic-select
  description: text('description'),
  iconUrl: text('icon_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bảng Classes: Lớp học phần (VD: Cơ sở dữ liệu - Nhóm 1)
export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // Mã lớp: INT3306_1
  name: varchar('name', { length: 200 }).notNull(),
  semester: varchar('semester', { length: 20 }), // Học kỳ: 2024_1
  lecturerId: uuid('lecturer_id').references(() => users.id), // Giảng viên phụ trách
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bảng Enrollment: Danh sách sinh viên trong lớp
export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id')
    .references(() => classes.id)
    .notNull(),
  studentId: uuid('student_id')
    .references(() => users.id)
    .notNull(),
  joinedAt: timestamp('joined_at').defaultNow(),
});

// ========================================================
// 3. NHÓM BÀI TẬP & CHẤM THI (Grading Domain)
// ========================================================

// Bảng Problems: Ngân hàng câu hỏi SQL
export const problems = pgTable('problems', {
  id: uuid('id').defaultRandom().primaryKey(),
  topicId: uuid('topic_id').references(() => topics.id), // Link tới chủ đề (để luyện tập)

  title: text('title').notNull(),
  description: text('description').notNull(), // Nội dung đề bài
  difficulty: varchar('difficulty', { length: 20 }).default('EASY'), // EASY, MEDIUM, HARD

  initSchemaSql: text('init_schema_sql').notNull(), // Script tạo bảng mẫu cho câu hỏi này
  correctQuery: text('correct_query').notNull(), // Câu SQL đáp án

  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

// Bảng Assignments: Bài tập giao cho lớp (Có thời hạn)
export const assignments = pgTable('assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  classId: uuid('class_id')
    .references(() => classes.id)
    .notNull(),
  name: varchar('name', { length: 200 }).notNull(), // VD: Bài kiểm tra giữa kỳ
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  isOpen: boolean('is_open').default(false), // Công tắc bật/tắt bài thi
  createdAt: timestamp('created_at').defaultNow(),
});

// Bảng AssignmentProblems: Bài thi gồm những câu hỏi nào + Điểm số
export const assignmentProblems = pgTable(
  'assignment_problems',
  {
    assignmentId: uuid('assignment_id')
      .references(() => assignments.id)
      .notNull(),
    problemId: uuid('problem_id')
      .references(() => problems.id)
      .notNull(),
    points: integer('points').default(10), // Điểm của câu này trong bài thi
  },
  (t) => ({
    pk: primaryKey({ columns: [t.assignmentId, t.problemId] }),
  }),
);

// Bảng Submissions: Lịch sử nộp bài (Trung tâm của hệ thống chấm)
export const submissions = pgTable('submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  problemId: uuid('problem_id')
    .references(() => problems.id)
    .notNull(),

  // QUAN TRỌNG:
  // - Nếu NULL: Đây là bài luyện tập tự do (theo Topic).
  // - Nếu CÓ GIÁ TRỊ: Đây là bài nộp cho bài tập về nhà/bài thi (Assignment).
  assignmentId: uuid('assignment_id').references(() => assignments.id),

  code: text('code').notNull(), // Code SQL sinh viên nộp

  status: varchar('status', { length: 20 }).default('PENDING'), // PENDING, ACCEPTED, WRONG_ANSWER, ERROR
  score: integer('score').default(0), // Điểm chấm được (0 hoặc 10/100)
  executionTime: integer('execution_time'), // Thời gian chạy (ms)
  errorLog: text('error_log'), // Log lỗi cú pháp (nếu có)

  submittedAt: timestamp('submitted_at').defaultNow(),
});
