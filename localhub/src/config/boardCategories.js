import { CATEGORY_CONFIG } from './mapCategories'

// 대분류: 지도에 표시되는 마커 카테고리 (여행코스 + 지역 정보 카테고리)
export const BOARD_MAIN_CATEGORIES = [
  { key: 'travel', label: '여행코스', color: '#e74c3c' },
  ...CATEGORY_CONFIG,
]

// 중분류: 게시글 유형
export const BOARD_SUB_CATEGORIES = [
  { key: 'free', label: '자유' },
  { key: 'question', label: '질문' },
  { key: 'info', label: '정보' },
  { key: 'review', label: '후기' },
]