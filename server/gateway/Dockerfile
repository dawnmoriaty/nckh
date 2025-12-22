# ------------------------------------
# GIAI ĐOẠN 1: BUILDER (Xây dựng)
# ------------------------------------
# Dùng Node 20 bản nhẹ (alpine) để build
FROM node:20-alpine AS builder

# Cài pnpm (vì image node mặc định không có pnpm)
RUN npm install -g pnpm

# Tạo thư mục làm việc trong container
WORKDIR /app

# Copy file định nghĩa thư viện trước (để tận dụng Docker Cache)
COPY package.json pnpm-lock.yaml ./

# Cài đặt thư viện (giống chạy pnpm install dưới máy thật)
# --frozen-lockfile: Đảm bảo cài đúng version trong file lock
RUN pnpm install --frozen-lockfile

# Copy toàn bộ code nguồn vào container
COPY . .

# Chạy lệnh build của NestJS (tạo ra thư mục /dist)
RUN pnpm build

# ------------------------------------
# GIAI ĐOẠN 2: RUNNER (Chạy thật)
# ------------------------------------
# Dùng một image mới tinh, sạch sẽ
FROM node:20-alpine

# Vẫn cần cài pnpm để chạy
RUN npm install -g pnpm

WORKDIR /app

# Chỉ copy những thứ cần thiết từ giai đoạn Builder sang
# 1. Copy code đã build (folder dist)
COPY --from=builder /app/dist ./dist
# 2. Copy thư viện (node_modules)
COPY --from=builder /app/node_modules ./node_modules
# 3. Copy file package.json (để script chạy được)
COPY --from=builder /app/package.json ./

# Mở cổng 3000 (cổng mặc định của NestJS)
EXPOSE 3000

# Lệnh chạy server khi container khởi động
CMD ["node", "dist/main"]