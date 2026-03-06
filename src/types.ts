export interface NewsData {
  headline: string;
  details: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  logoUrl?: string;
  logoText: string;
  date: string;
  detailsFontSize?: number;
  newsType: string;
  themeColor: string;
}
