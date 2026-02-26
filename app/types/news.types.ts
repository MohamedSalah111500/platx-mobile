export interface NewsItem {
  id: number;
  title: string;
  subTitle?: string;
  description?: string;
  category?: string;
  categoryName?: string;
  imageUrl?: string;
  imageURl?: string;
  staffName?: string;
  staffId?: string | null;
  createdAt?: string;
  createdDate?: string;
  updatedAt?: string;
}

export interface CreateNewsPayload {
  title: string;
  subTitle?: string;
  description: string;
  categoryName?: string;
  image?: any; // FormData file
}
