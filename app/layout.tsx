import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'배관노트 | 현장부터 정산까지',description:'소규모 배관 설비 업체를 위한 문의, 견적, 승인, 배정, 자재, 정산 관리',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>;}
