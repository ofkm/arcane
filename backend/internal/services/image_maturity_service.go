package services

import (
	"context"
	"fmt"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
)

// Remove the local ImageMaturityRecord type - use models.ImageMaturityRecord directly

type ImageMaturityService struct {
	db *database.DB
}

func NewImageMaturityService(db *database.DB) *ImageMaturityService {
	return &ImageMaturityService{db: db}
}

func (s *ImageMaturityService) GetImageMaturity(ctx context.Context, imageID string) (*models.ImageMaturityRecord, error) {
	var record models.ImageMaturityRecord
	if err := s.db.WithContext(ctx).Where("id = ?", imageID).First(&record).Error; err != nil {
		return nil, fmt.Errorf("failed to get image maturity: %w", err)
	}
	return &record, nil
}

func (s *ImageMaturityService) SetImageMaturity(ctx context.Context, imageID, repository, tag string, maturity models.ImageMaturity, metadata map[string]interface{}) error {
	now := time.Now()

	record := &models.ImageMaturityRecord{
		ID:               imageID,
		Repository:       repository,
		Tag:              tag,
		CurrentVersion:   maturity.Version,
		Status:           maturity.Status,
		UpdatesAvailable: maturity.UpdatesAvailable,
		LastChecked:      now,
		BaseModel:        models.BaseModel{CreatedAt: now},
	}

	// Extract metadata
	if registryDomain, ok := metadata["registryDomain"].(string); ok {
		record.RegistryDomain = &registryDomain
	}
	if isPrivate, ok := metadata["isPrivateRegistry"].(bool); ok {
		record.IsPrivateRegistry = isPrivate
	}
	if responseTime, ok := metadata["responseTimeMs"].(int); ok {
		record.ResponseTimeMs = &responseTime
	}
	if errorMsg, ok := metadata["error"].(string); ok {
		record.LastError = &errorMsg
	}
	if latestVersion, ok := metadata["latestVersion"].(string); ok {
		record.LatestVersion = &latestVersion
	}
	if currentDate, ok := metadata["currentImageDate"].(time.Time); ok {
		record.CurrentImageDate = &currentDate
	}
	if latestDate, ok := metadata["latestImageDate"].(time.Time); ok {
		record.LatestImageDate = &latestDate
	}
	if days, ok := metadata["daysSinceCreation"].(int); ok {
		record.DaysSinceCreation = &days
	}

	// Increment check count if this is an update
	existing, err := s.GetImageMaturity(ctx, imageID)
	if err == nil {
		record.CheckCount = existing.CheckCount + 1
		record.BaseModel.CreatedAt = existing.BaseModel.CreatedAt // Keep original creation time
	}

	// Upsert operation
	if err := s.db.WithContext(ctx).Save(record).Error; err != nil {
		return fmt.Errorf("failed to set image maturity: %w", err)
	}

	return nil
}

func (s *ImageMaturityService) GetImagesNeedingCheck(ctx context.Context, maxAgeMinutes int, limit int) ([]*models.ImageMaturityRecord, error) {
	cutoff := time.Now().Add(-time.Duration(maxAgeMinutes) * time.Minute)

	var records []*models.ImageMaturityRecord
	if err := s.db.WithContext(ctx).
		Where("last_checked < ?", cutoff).
		Order("last_checked ASC").
		Limit(limit).
		Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to get images needing check: %w", err)
	}

	return records, nil
}

func (s *ImageMaturityService) GetImagesWithUpdates(ctx context.Context) ([]*models.ImageMaturityRecord, error) {
	var records []*models.ImageMaturityRecord
	if err := s.db.WithContext(ctx).
		Where("updates_available = ?", true).
		Order("last_checked DESC").
		Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to get images with updates: %w", err)
	}

	return records, nil
}

func (s *ImageMaturityService) GetMaturityStats(ctx context.Context) (map[string]interface{}, error) {
	var total int64
	var withUpdates int64
	var matured int64
	var notMatured int64
	var unknown int64

	// Count totals using the model directly
	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Count(&total)
	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Where("updates_available = ?", true).Count(&withUpdates)
	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Where("status = ?", models.ImageStatusMatured).Count(&matured)
	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Where("status = ?", models.ImageStatusNotMatured).Count(&notMatured)
	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Where("status = ?", models.ImageStatusUnknown).Count(&unknown)

	// Count recently checked (last hour)
	var recentlyChecked int64
	oneHourAgo := time.Now().Add(-time.Hour)
	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Where("last_checked > ?", oneHourAgo).Count(&recentlyChecked)

	return map[string]interface{}{
		"total":           total,
		"withUpdates":     withUpdates,
		"matured":         matured,
		"notMatured":      notMatured,
		"unknown":         unknown,
		"recentlyChecked": recentlyChecked,
	}, nil
}

func (s *ImageMaturityService) CleanupOrphanedRecords(ctx context.Context, existingImageIDs []string) (int, error) {
	if len(existingImageIDs) == 0 {
		// Delete all records if no images exist
		result := s.db.WithContext(ctx).Delete(&models.ImageMaturityRecord{})
		return int(result.RowsAffected), result.Error
	}

	// Delete records not in the existing IDs list
	result := s.db.WithContext(ctx).Where("id NOT IN ?", existingImageIDs).Delete(&models.ImageMaturityRecord{})
	return int(result.RowsAffected), result.Error
}

// Additional helper methods
func (s *ImageMaturityService) ListAllMaturityRecords(ctx context.Context) ([]*models.ImageMaturityRecord, error) {
	var records []*models.ImageMaturityRecord
	if err := s.db.WithContext(ctx).Order("last_checked DESC").Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to list maturity records: %w", err)
	}
	return records, nil
}

func (s *ImageMaturityService) GetMaturityByRepository(ctx context.Context, repository string) ([]*models.ImageMaturityRecord, error) {
	var records []*models.ImageMaturityRecord
	if err := s.db.WithContext(ctx).
		Where("repository = ?", repository).
		Order("tag ASC").
		Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to get maturity by repository: %w", err)
	}
	return records, nil
}

func (s *ImageMaturityService) UpdateCheckStatus(ctx context.Context, imageID string, status string, errorMsg *string) error {
	updates := map[string]interface{}{
		"status":       status,
		"last_checked": time.Now(),
		"updated_at":   time.Now(),
	}

	if errorMsg != nil {
		updates["last_error"] = *errorMsg
	} else {
		updates["last_error"] = nil
	}

	if err := s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).
		Where("id = ?", imageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update check status: %w", err)
	}

	return nil
}

func (s *ImageMaturityService) MarkAsMatured(ctx context.Context, imageID string, daysSinceCreation int) error {
	updates := map[string]interface{}{
		"status":              models.ImageStatusMatured,
		"days_since_creation": daysSinceCreation,
		"last_checked":        time.Now(),
		"updated_at":          time.Now(),
	}

	if err := s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).
		Where("id = ?", imageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to mark as matured: %w", err)
	}

	return nil
}

func (s *ImageMaturityService) SetUpdateAvailable(ctx context.Context, imageID string, hasUpdate bool, latestVersion *string) error {
	updates := map[string]interface{}{
		"updates_available": hasUpdate,
		"last_checked":      time.Now(),
		"updated_at":        time.Now(),
	}

	if latestVersion != nil {
		updates["latest_version"] = *latestVersion
	}

	if err := s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).
		Where("id = ?", imageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to set update availability: %w", err)
	}

	return nil
}
