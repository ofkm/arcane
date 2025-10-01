package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"crypto/subtle"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
)

type Argon2Params struct {
	memory      uint32
	iterations  uint32
	parallelism uint8
	saltLength  uint32
	keyLength   uint32
}

func DefaultArgon2Params() *Argon2Params {
	return &Argon2Params{
		memory:      64 * 1024,
		iterations:  3,
		parallelism: 2,
		saltLength:  16,
		keyLength:   32,
	}
}

type UserService struct {
	db           *database.DB
	argon2Params *Argon2Params
}

func NewUserService(db *database.DB) *UserService {
	return &UserService{
		db:           db,
		argon2Params: DefaultArgon2Params(),
	}
}

func (s *UserService) hashPassword(password string) (string, error) {
	salt := make([]byte, s.argon2Params.saltLength)
	_, err := rand.Read(salt)
	if err != nil {
		return "", err
	}

	hash := argon2.IDKey([]byte(password), salt, s.argon2Params.iterations, s.argon2Params.memory, s.argon2Params.parallelism, s.argon2Params.keyLength)

	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	encodedHash := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s", argon2.Version, s.argon2Params.memory, s.argon2Params.iterations, s.argon2Params.parallelism, b64Salt, b64Hash)

	return encodedHash, nil
}

func (s *UserService) ValidatePassword(encodedHash, password string) error {
	// Check if it's a bcrypt hash (starts with $2a$, $2b$, or $2y$)
	if strings.HasPrefix(encodedHash, "$2a$") || strings.HasPrefix(encodedHash, "$2b$") || strings.HasPrefix(encodedHash, "$2y$") {
		return s.validateBcryptPassword(encodedHash, password)
	}

	// Otherwise, assume it's Argon2
	return s.validateArgon2Password(encodedHash, password)
}

func (s *UserService) validateBcryptPassword(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

func (s *UserService) validateArgon2Password(encodedHash, password string) error {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return fmt.Errorf("invalid hash format")
	}

	var version int
	_, err := fmt.Sscanf(parts[2], "v=%d", &version)
	if err != nil {
		return err
	}
	if version != argon2.Version {
		return fmt.Errorf("incompatible version of argon2")
	}

	var memory, iterations uint32
	var parallelism uint8
	_, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism)
	if err != nil {
		return err
	}

	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return err
	}

	decodedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return err
	}

	hashLen := len(decodedHash)
	if hashLen < 0 || hashLen > 0x7fffffff {
		return fmt.Errorf("invalid hash length")
	}

	comparisonHash := argon2.IDKey([]byte(password), salt, iterations, memory, parallelism, uint32(hashLen))

	// constant-time compare
	if subtle.ConstantTimeCompare(comparisonHash, decodedHash) != 1 {
		return fmt.Errorf("invalid password")
	}

	return nil
}

func (s *UserService) CreateUser(ctx context.Context, user *models.User) (*models.User, error) {
	if err := s.db.WithContext(ctx).Create(user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return user, nil
}

func (s *UserService) CreateUserWithPassword(username, password, email, role string, displayName string) (*models.User, error) {
	hashedPassword, err := s.hashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &models.User{
		Username:     username,
		Email:        &email,
		DisplayName:  &displayName,
		PasswordHash: hashedPassword,
		Roles:        models.StringSlice{role},
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (s *UserService) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func (s *UserService) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func (s *UserService) GetUserByOidcSubjectId(ctx context.Context, subjectId string) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("oidc_subject_id = ?", subjectId).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func (s *UserService) UpdateUser(ctx context.Context, user *models.User) (*models.User, error) {
	if err := s.db.WithContext(ctx).Save(user).Error; err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	return user, nil
}

func (s *UserService) CountUsers() (int64, error) {
	var count int64
	if err := s.db.Model(&models.User{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (s *UserService) CreateDefaultAdmin() error {
	count, err := s.CountUsers()
	if err != nil {
		return fmt.Errorf("failed to count users: %w", err)
	}

	if count > 0 {
		slog.Warn("Users already exist, skipping default admin creation")
		return nil
	}

	_, err = s.CreateUserWithPassword("arcane", "arcane-admin", "admin@localhost", "admin", "Arcane Admin")
	if err != nil {
		return fmt.Errorf("failed to create default admin user: %w", err)
	}

	slog.Info("👑 Default admin user created!")
	slog.Info("🔑 Username: arcane")
	slog.Info("🔑 Password: arcane-admin")
	slog.Info("⚠️  Please change this password after first login!")

	return nil
}

func (s *UserService) DeleteUser(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.User{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}

func (s *UserService) HashPassword(password string) (string, error) {
	return s.hashPassword(password)
}

func (s *UserService) NeedsPasswordUpgrade(hash string) bool {
	return strings.HasPrefix(hash, "$2a$") || strings.HasPrefix(hash, "$2b$") || strings.HasPrefix(hash, "$2y$")
}

func (s *UserService) UpgradePasswordHash(ctx context.Context, userID, password string) error {
	newHash, err := s.hashPassword(password)
	if err != nil {
		return fmt.Errorf("failed to create new hash: %w", err)
	}

	return s.db.WithContext(ctx).Model(&models.User{}).
		Where("id = ?", userID).
		Update("password_hash", newHash).Error
}

func (s *UserService) ListUsersPaginated(ctx context.Context, params pagination.QueryParams) ([]dto.UserResponseDto, pagination.Response, error) {
	var users []models.User
	query := s.db.WithContext(ctx).Model(&models.User{})

	if term := strings.TrimSpace(params.Search); term != "" {
		searchPattern := "%" + term + "%"
		query = query.Where(
			"username LIKE ? OR COALESCE(email, '') LIKE ? OR COALESCE(display_name, '') LIKE ?",
			searchPattern, searchPattern, searchPattern,
		)
	}

	paginationResp, err := pagination.PaginateAndSortDB(params, query, &users)
	if err != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to paginate users: %w", err)
	}

	result := make([]dto.UserResponseDto, len(users))
	for i, user := range users {
		result[i] = toUserResponseDto(user)
	}

	return result, paginationResp, nil
}

func toUserResponseDto(user models.User) dto.UserResponseDto {
	return dto.UserResponseDto{
		ID:            user.ID,
		Username:      user.Username,
		DisplayName:   user.DisplayName,
		Email:         user.Email,
		Roles:         user.Roles,
		OidcSubjectId: user.OidcSubjectId,
		Locale:        user.Locale,
		CreatedAt:     user.CreatedAt.Format("2006-01-02T15:04:05.999999Z"),
		UpdatedAt:     user.UpdatedAt.Format("2006-01-02T15:04:05.999999Z"),
	}
}

func (s *UserService) GetUser(ctx context.Context, userID string) (*models.User, error) {
	slog.Debug("GetUser called", "user_id", userID)
	return s.getUserInternal(ctx, userID, s.db.DB)
}

func (s *UserService) getUserInternal(ctx context.Context, userID string, tx *gorm.DB) (*models.User, error) {
	var user models.User
	err := tx.
		WithContext(ctx).
		Where("id = ?", userID).
		First(&user).
		Error
	return &user, err
}
