package dto

type ImagePullDto struct {
	ImageName string `json:"imageName" binding:"required"`
}
