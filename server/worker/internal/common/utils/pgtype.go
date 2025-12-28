package utils

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// TimeToPgTimestamp converts time.Time to pgtype.Timestamp
func TimeToPgTimestamp(t time.Time) pgtype.Timestamp {
	if t.IsZero() {
		return pgtype.Timestamp{Valid: false}
	}
	return pgtype.Timestamp{Time: t, Valid: true}
}

// PgTimestampToTime converts pgtype.Timestamp to time.Time
func PgTimestampToTime(ts pgtype.Timestamp) time.Time {
	if !ts.Valid {
		return time.Time{}
	}
	return ts.Time
}

// PgTimestampToTimePtr converts pgtype.Timestamp to *time.Time
func PgTimestampToTimePtr(ts pgtype.Timestamp) *time.Time {
	if !ts.Valid {
		return nil
	}
	t := ts.Time
	return &t
}

// TimePtrToPgTimestamp converts *time.Time to pgtype.Timestamp
func TimePtrToPgTimestamp(t *time.Time) pgtype.Timestamp {
	if t == nil || t.IsZero() {
		return pgtype.Timestamp{Valid: false}
	}
	return pgtype.Timestamp{Time: *t, Valid: true}
}

// StringToPgText converts string to pgtype.Text
func StringToPgText(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: s, Valid: true}
}

// PgTextToString converts pgtype.Text to string
func PgTextToString(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

// Int32ToPgInt4 converts int32 to pgtype.Int4
func Int32ToPgInt4(i int32) pgtype.Int4 {
	return pgtype.Int4{Int32: i, Valid: true}
}

// PgInt4ToInt32 converts pgtype.Int4 to int32
func PgInt4ToInt32(i pgtype.Int4) int32 {
	if !i.Valid {
		return 0
	}
	return i.Int32
}

// Int64ToPgInt8 converts int64 to pgtype.Int8
func Int64ToPgInt8(i int64) pgtype.Int8 {
	return pgtype.Int8{Int64: i, Valid: true}
}

// PgInt8ToInt64 converts pgtype.Int8 to int64
func PgInt8ToInt64(i pgtype.Int8) int64 {
	if !i.Valid {
		return 0
	}
	return i.Int64
}

// BoolToPgBool converts bool to pgtype.Bool
func BoolToPgBool(b bool) pgtype.Bool {
	return pgtype.Bool{Bool: b, Valid: true}
}

// PgBoolToBool converts pgtype.Bool to bool
func PgBoolToBool(b pgtype.Bool) bool {
	if !b.Valid {
		return false
	}
	return b.Bool
}
