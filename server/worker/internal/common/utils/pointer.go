package utils

// StringPtr returns a pointer to the given string, or nil if empty
func StringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// BoolPtr returns a pointer to the given bool
func BoolPtr(b bool) *bool {
	return &b
}

// PtrBoolValue returns the value of a bool pointer, or false if nil
func PtrBoolValue(b *bool) bool {
	if b == nil {
		return false
	}
	return *b
}

// PtrStringValue returns the value of a string pointer, or empty string if nil
func PtrStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// Int32Ptr returns a pointer to the given int32
func Int32Ptr(i int32) *int32 {
	return &i
}

// Int64Ptr returns a pointer to the given int64
func Int64Ptr(i int64) *int64 {
	return &i
}

// PtrInt32Value returns the value of an int32 pointer, or 0 if nil
func PtrInt32Value(i *int32) int32 {
	if i == nil {
		return 0
	}
	return *i
}

// PtrInt64Value returns the value of an int64 pointer, or 0 if nil
func PtrInt64Value(i *int64) int64 {
	if i == nil {
		return 0
	}
	return *i
}
