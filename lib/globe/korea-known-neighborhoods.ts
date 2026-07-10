import type { KoreaKnownPlace } from "@/lib/globe/korea-known-places";
import { normalizePlaceLabel } from "@/lib/globe/normalize-place-label";

export type KoreaNeighborhoodSeed = {
  label: string;
  lat: number;
  lng: number;
  city: string;
  gu?: string;
  name: string;
  /** Allow matching dong/읍 name alone when unambiguous in this registry. */
  uniqueBare?: boolean;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function stripGu(value: string): string {
  return value.replace(/구$/u, "").trim();
}

function stripDong(value: string): string {
  return value.replace(/(동|읍|가|로)$/u, "").trim();
}

function buildNeighborhoodPattern(seed: KoreaNeighborhoodSeed): RegExp {
  const city = escapeRegExp(seed.city);
  const gu = seed.gu ? escapeRegExp(stripGu(seed.gu)) : "";
  const guFull = seed.gu ? escapeRegExp(seed.gu) : "";
  const name = escapeRegExp(seed.name);
  const nameShort = escapeRegExp(stripDong(seed.name));
  const parts = [
    `${city}${guFull}${name}`,
    `${city}\\s*${guFull}\\s*${name}`,
    `${city}\\s*${gu}\\s*${nameShort}`,
    `${city}\\s*${guFull}\\s*${nameShort}`,
  ];
  if (seed.uniqueBare === true) {
    parts.push(name, nameShort);
  }
  return new RegExp(parts.join("|"), "iu");
}

function hood(seed: KoreaNeighborhoodSeed): KoreaKnownPlace {
  return {
    pattern: buildNeighborhoodPattern(seed),
    label: seed.label,
    lat: seed.lat,
    lng: seed.lng,
  };
}

/** High-traffic 동·읍 — city+gu+dong patterns; bare dong only when uniqueBare. */
export const KOREA_KNOWN_NEIGHBORHOODS: readonly KoreaKnownPlace[] = [
  // —— 서울 ——
  hood({ label: "서울 강서 화곡동", city: "서울", gu: "강서구", name: "화곡동", lat: 37.541, lng: 126.84 }),
  hood({ label: "서울 송파 가락동", city: "서울", gu: "송파구", name: "가락동", lat: 37.495, lng: 127.118, uniqueBare: true }),
  hood({ label: "서울 송파 잠실동", city: "서울", gu: "송파구", name: "잠실동", lat: 37.513, lng: 127.1, uniqueBare: true }),
  hood({ label: "서울 관악 신림동", city: "서울", gu: "관악구", name: "신림동", lat: 37.484, lng: 126.929, uniqueBare: true }),
  hood({ label: "서울 마포 서교동", city: "서울", gu: "마포구", name: "서교동", lat: 37.555, lng: 126.922 }),
  hood({ label: "서울 마포 연남동", city: "서울", gu: "마포구", name: "연남동", lat: 37.565, lng: 126.923, uniqueBare: true }),
  hood({ label: "서울 마포 망원동", city: "서울", gu: "마포구", name: "망원동", lat: 37.556, lng: 126.906, uniqueBare: true }),
  hood({ label: "서울 마포 공덕동", city: "서울", gu: "마포구", name: "공덕동", lat: 37.544, lng: 126.951 }),
  hood({ label: "서울 강남 역삼동", city: "서울", gu: "강남구", name: "역삼동", lat: 37.5, lng: 127.036, uniqueBare: true }),
  hood({ label: "서울 강남 삼성동", city: "서울", gu: "강남구", name: "삼성동", lat: 37.514, lng: 127.063 }),
  hood({ label: "서울 강남 논현동", city: "서울", gu: "강남구", name: "논현동", lat: 37.511, lng: 127.031, uniqueBare: true }),
  hood({ label: "서울 강남 개포동", city: "서울", gu: "강남구", name: "개포동", lat: 37.489, lng: 127.066 }),
  hood({ label: "서울 강남 도곡동", city: "서울", gu: "강남구", name: "도곡동", lat: 37.491, lng: 127.055 }),
  hood({ label: "서울 강남 수서동", city: "서울", gu: "강남구", name: "수서동", lat: 37.487, lng: 127.101 }),
  hood({ label: "서울 중구 명동", city: "서울", gu: "중구", name: "명동", lat: 37.564, lng: 126.986, uniqueBare: true }),
  hood({ label: "서울 중구 회현동", city: "서울", gu: "중구", name: "회현동", lat: 37.558, lng: 126.978 }),
  hood({ label: "서울 중구 신당동", city: "서울", gu: "중구", name: "신당동", lat: 37.566, lng: 127.017 }),
  hood({ label: "서울 서초 서초동", city: "서울", gu: "서초구", name: "서초동", lat: 37.483, lng: 127.032 }),
  hood({ label: "서울 서초 반포동", city: "서울", gu: "서초구", name: "반포동", lat: 37.504, lng: 127.002, uniqueBare: true }),
  hood({ label: "서울 서초 방배동", city: "서울", gu: "서초구", name: "방배동", lat: 37.481, lng: 126.997 }),
  hood({ label: "서울 은평 불광동", city: "서울", gu: "은평구", name: "불광동", lat: 37.61, lng: 126.93 }),
  hood({ label: "서울 은평 진관동", city: "서울", gu: "은평구", name: "진관동", lat: 37.638, lng: 126.928 }),
  hood({ label: "서울 강동 천호동", city: "서울", gu: "강동구", name: "천호동", lat: 37.538, lng: 127.123 }),
  hood({ label: "서울 강동 명일동", city: "서울", gu: "강동구", name: "명일동", lat: 37.551, lng: 127.143 }),
  hood({ label: "서울 영등포 여의도동", city: "서울", gu: "영등포구", name: "여의도동", lat: 37.521, lng: 126.924, uniqueBare: true }),
  hood({ label: "서울 영등포 영등포동", city: "서울", gu: "영등포구", name: "영등포동", lat: 37.516, lng: 126.908 }),
  hood({ label: "서울 노원 상계동", city: "서울", gu: "노원구", name: "상계동", lat: 37.661, lng: 127.068, uniqueBare: true }),
  hood({ label: "서울 양천 목동", city: "서울", gu: "양천구", name: "목동", lat: 37.53, lng: 126.875, uniqueBare: true }),
  hood({ label: "서울 종로 종로1가", city: "서울", gu: "종로구", name: "종로1가동", lat: 37.57, lng: 126.979 }),
  hood({ label: "서울 동작 노량진동", city: "서울", gu: "동작구", name: "노량진동", lat: 37.513, lng: 126.942, uniqueBare: true }),
  hood({ label: "서울 관악 봉천동", city: "서울", gu: "관악구", name: "봉천동", lat: 37.482, lng: 126.941 }),
  hood({ label: "서울 구로 구로동", city: "서울", gu: "구로구", name: "구로동", lat: 37.495, lng: 126.887 }),
  hood({ label: "서울 금천 가산동", city: "서울", gu: "금천구", name: "가산동", lat: 37.478, lng: 126.886, uniqueBare: true }),
  hood({ label: "서울 동대문 장안동", city: "서울", gu: "동대문구", name: "장안동", lat: 37.572, lng: 127.07 }),
  hood({ label: "서울 성동 행당동", city: "서울", gu: "성동구", name: "행당동", lat: 37.557, lng: 127.029 }),
  hood({ label: "서울 성동 성수동", city: "서울", gu: "성동구", name: "성수동", lat: 37.544, lng: 127.055, uniqueBare: true }),
  hood({ label: "서울 광진 자양동", city: "서울", gu: "광진구", name: "자양동", lat: 37.531, lng: 127.067 }),
  hood({ label: "서울 용산 한남동", city: "서울", gu: "용산구", name: "한남동", lat: 37.534, lng: 127.002, uniqueBare: true }),
  hood({ label: "서울 용산 이태원동", city: "서울", gu: "용산구", name: "이태원동", lat: 37.534, lng: 126.994, uniqueBare: true }),
  hood({ label: "서울 서대문 남가좌동", city: "서울", gu: "서대문구", name: "남가좌동", lat: 37.579, lng: 126.918 }),
  hood({ label: "서울 강북 미아동", city: "서울", gu: "강북구", name: "미아동", lat: 37.626, lng: 127.028 }),
  hood({ label: "서울 도봉 창동", city: "서울", gu: "도봉구", name: "창동", lat: 37.653, lng: 127.047, uniqueBare: true }),
  hood({ label: "서울 중랑 상봉동", city: "서울", gu: "중랑구", name: "상봉동", lat: 37.596, lng: 127.086, uniqueBare: true }),

  // —— 경기 ——
  hood({ label: "수원 팔달 인계동", city: "수원", gu: "팔달구", name: "인계동", lat: 37.265, lng: 127.028, uniqueBare: true }),
  hood({ label: "수원 영통 영통동", city: "수원", gu: "영통구", name: "영통동", lat: 37.252, lng: 127.071 }),
  hood({ label: "화성 동탄동", city: "화성", name: "동탄동", lat: 37.199, lng: 127.075, uniqueBare: true }),
  hood({ label: "용인 수지 풍덕천동", city: "용인", gu: "수지구", name: "풍덕천동", lat: 37.325, lng: 127.095 }),
  hood({ label: "용인 기흥 보정동", city: "용인", gu: "기흥구", name: "보정동", lat: 37.321, lng: 127.108 }),
  hood({ label: "성남 분당 서현동", city: "성남", gu: "분당구", name: "서현동", lat: 37.385, lng: 127.124, uniqueBare: true }),
  hood({ label: "성남 분당 야탑동", city: "성남", gu: "분당구", name: "야탑동", lat: 37.411, lng: 127.129 }),
  hood({ label: "성남 분당 정자동", city: "성남", gu: "분당구", name: "정자동", lat: 37.367, lng: 127.108, uniqueBare: true }),
  hood({ label: "성남 분당 판교동", city: "성남", gu: "분당구", name: "판교동", lat: 37.394, lng: 127.111, uniqueBare: true }),
  hood({ label: "성남 분당 구미동", city: "성남", gu: "분당구", name: "구미동", lat: 37.349, lng: 127.113 }),
  hood({ label: "부천 원미 중동", city: "부천", gu: "원미구", name: "중동", lat: 37.503, lng: 126.766 }),
  hood({ label: "안산 단원 고잔동", city: "안산", gu: "단원구", name: "고잔동", lat: 37.318, lng: 126.838 }),
  hood({ label: "안산 상록 사동", city: "안산", gu: "상록구", name: "사동", lat: 37.298, lng: 126.845 }),
  hood({ label: "평택 비전동", city: "평택", name: "비전동", lat: 36.998, lng: 127.112, uniqueBare: true }),
  hood({ label: "파주 야당동", city: "파주", name: "야당동", lat: 37.712, lng: 126.761, uniqueBare: true }),
  hood({ label: "고양 일산 마두동", city: "고양", gu: "일산동구", name: "마두동", lat: 37.652, lng: 126.777 }),
  hood({ label: "고양 일산 식사동", city: "고양", gu: "일산동구", name: "식사동", lat: 37.667, lng: 126.826 }),
  hood({ label: "고양 일산서 주엽동", city: "고양", gu: "일산서구", name: "주엽동", lat: 37.672, lng: 126.761 }),
  hood({ label: "고양 일산서 탄현동", city: "고양", gu: "일산서구", name: "탄현동", lat: 37.694, lng: 126.769 }),
  hood({ label: "안양 동안 평촌동", city: "안양", gu: "동안구", name: "평촌동", lat: 37.389, lng: 126.963, uniqueBare: true }),
  hood({ label: "안양 만안 안양동", city: "안양", gu: "만안구", name: "안양동", lat: 37.394, lng: 126.921 }),
  hood({ label: "군포 산본동", city: "군포", name: "산본동", lat: 37.361, lng: 126.933, uniqueBare: true }),
  hood({ label: "의정부 의정부동", city: "의정부", name: "의정부동", lat: 37.738, lng: 127.034 }),
  hood({ label: "김포 풍무동", city: "김포", name: "풍무동", lat: 37.612, lng: 126.718 }),
  hood({ label: "경기 광주 오포읍", city: "경기", gu: "광주", name: "오포읍", lat: 37.363, lng: 127.228 }),
  hood({ label: "이천 창전동", city: "이천", name: "창전동", lat: 37.272, lng: 127.435 }),
  hood({ label: "하남 망월동", city: "하남", name: "망월동", lat: 37.552, lng: 127.214 }),
  hood({ label: "남양주 다산동", city: "남양주", name: "다산동", lat: 37.607, lng: 127.156, uniqueBare: true }),
  hood({ label: "시흥 정왕동", city: "시흥", name: "정왕동", lat: 37.345, lng: 126.742 }),
  hood({ label: "화성 향남읍", city: "화성", name: "향남읍", lat: 37.104, lng: 126.905 }),
  hood({ label: "오산 오산동", city: "오산", name: "오산동", lat: 37.149, lng: 127.077 }),
  hood({ label: "양주 옥정동", city: "양주", name: "옥정동", lat: 37.822, lng: 127.097 }),
  hood({ label: "포천 소흘읍", city: "포천", name: "소흘읍", lat: 37.795, lng: 127.136 }),
  hood({ label: "여주 교동", city: "여주", name: "교동", lat: 37.295, lng: 127.645 }),

  // —— 부산 ——
  hood({ label: "부산 서면", city: "부산", gu: "부산진구", name: "서면", lat: 35.1579, lng: 129.059, uniqueBare: true }),
  hood({ label: "부산 해운대 우동", city: "부산", gu: "해운대구", name: "우동", lat: 35.163, lng: 129.158 }),
  hood({ label: "부산 해운대 좌동", city: "부산", gu: "해운대구", name: "좌동", lat: 35.173, lng: 129.175 }),
  hood({ label: "부산 해운대 재송동", city: "부산", gu: "해운대구", name: "재송동", lat: 35.184, lng: 129.164 }),
  hood({ label: "부산 부산진 부전동", city: "부산", gu: "부산진구", name: "부전동", lat: 35.158, lng: 129.06 }),
  hood({ label: "부산 부산진 개금동", city: "부산", gu: "부산진구", name: "개금동", lat: 35.152, lng: 129.02 }),
  hood({ label: "부산 남구 대연동", city: "부산", gu: "남구", name: "대연동", lat: 35.136, lng: 129.089 }),
  hood({ label: "부산 북구 화명동", city: "부산", gu: "북구", name: "화명동", lat: 35.233, lng: 129.009 }),
  hood({ label: "부산 사하 하단동", city: "부산", gu: "사하구", name: "하단동", lat: 35.106, lng: 128.965 }),
  hood({ label: "부산 동래 온천동", city: "부산", gu: "동래구", name: "온천동", lat: 35.204, lng: 129.078 }),
  hood({ label: "부산 사상 주례동", city: "부산", gu: "사상구", name: "주례동", lat: 35.164, lng: 128.99 }),
  hood({ label: "부산 금정 구서동", city: "부산", gu: "금정구", name: "구서동", lat: 35.249, lng: 129.092 }),

  // —— 인천 ——
  hood({ label: "인천 부평 부평동", city: "인천", gu: "부평구", name: "부평동", lat: 37.507, lng: 126.722 }),
  hood({ label: "인천 부평 삼산동", city: "인천", gu: "부평구", name: "삼산동", lat: 37.515, lng: 126.738 }),
  hood({ label: "인천 남동 구월동", city: "인천", gu: "남동구", name: "구월동", lat: 37.448, lng: 126.731, uniqueBare: true }),
  hood({ label: "인천 연수 송도동", city: "인천", gu: "연수구", name: "송도동", lat: 37.382, lng: 126.656, uniqueBare: true }),
  hood({ label: "인천 연수 동춘동", city: "인천", gu: "연수구", name: "동춘동", lat: 37.409, lng: 126.678 }),
  hood({ label: "인천 미추홀 주안동", city: "인천", gu: "미추홀구", name: "주안동", lat: 37.463, lng: 126.679, uniqueBare: true }),
  hood({ label: "인천 서구 청라동", city: "인천", gu: "서구", name: "청라동", lat: 37.538, lng: 126.636, uniqueBare: true }),
  hood({ label: "인천 계양 계산동", city: "인천", gu: "계양구", name: "계산동", lat: 37.537, lng: 126.738 }),
  hood({ label: "인천 중구 영종동", city: "인천", gu: "중구", name: "영종동", lat: 37.496, lng: 126.493 }),

  // —— 대전 ——
  hood({ label: "대전 서구 둔산동", city: "대전", gu: "서구", name: "둔산동", lat: 36.351, lng: 127.385, uniqueBare: true }),
  hood({ label: "대전 유성 봉명동", city: "대전", gu: "유성구", name: "봉명동", lat: 36.356, lng: 127.335 }),
  hood({ label: "대전 서구 탄방동", city: "대전", gu: "서구", name: "탄방동", lat: 36.345, lng: 127.39 }),
  hood({ label: "대전 유성 노은동", city: "대전", gu: "유성구", name: "노은동", lat: 36.362, lng: 127.356, uniqueBare: true }),
  hood({ label: "대전 유성 신성동", city: "대전", gu: "유성구", name: "신성동", lat: 36.383, lng: 127.347 }),
  hood({ label: "대전 서구 관저동", city: "대전", gu: "서구", name: "관저동", lat: 36.296, lng: 127.337 }),

  // —— 대구 ——
  hood({ label: "대구 중구 동성로", city: "대구", gu: "중구", name: "동성로", lat: 35.869, lng: 128.596, uniqueBare: true }),
  hood({ label: "대구 수성 범어동", city: "대구", gu: "수성구", name: "범어동", lat: 35.858, lng: 128.631, uniqueBare: true }),
  hood({ label: "대구 달서 월성동", city: "대구", gu: "달서구", name: "월성동", lat: 35.83, lng: 128.524 }),
  hood({ label: "대구 달서 상인동", city: "대구", gu: "달서구", name: "상인동", lat: 35.812, lng: 128.553 }),
  hood({ label: "대구 북구 침산동", city: "대구", gu: "북구", name: "침산동", lat: 35.886, lng: 128.582 }),
  hood({ label: "대구 수성 황금동", city: "대구", gu: "수성구", name: "황금동", lat: 35.844, lng: 128.628 }),

  // —— 광주 ——
  hood({ label: "광주 서구 치평동", city: "광주", gu: "서구", name: "치평동", lat: 35.152, lng: 126.89 }),
  hood({ label: "광주 북구 용봉동", city: "광주", gu: "북구", name: "용봉동", lat: 35.174, lng: 126.912 }),
  hood({ label: "광주 광산 수완동", city: "광주", gu: "광산구", name: "수완동", lat: 35.19, lng: 126.823 }),
  hood({ label: "광주 남구 봉선동", city: "광주", gu: "남구", name: "봉선동", lat: 35.133, lng: 126.903 }),
  hood({ label: "광주 남구 진월동", city: "광주", gu: "남구", name: "진월동", lat: 35.128, lng: 126.894 }),
  hood({ label: "광주 서구 풍암동", city: "광주", gu: "서구", name: "풍암동", lat: 35.13, lng: 126.877 }),

  // —— 울산 ——
  hood({ label: "울산 남구 삼산동", city: "울산", gu: "남구", name: "삼산동", lat: 35.544, lng: 129.33, uniqueBare: true }),
  hood({ label: "울산 중구 우정동", city: "울산", gu: "중구", name: "우정동", lat: 35.568, lng: 129.332 }),
  hood({ label: "울산 울주 범서읍", city: "울산", gu: "울주군", name: "범서읍", lat: 35.569, lng: 129.237 }),
  hood({ label: "울산 울주 언양읍", city: "울산", gu: "울주군", name: "언양읍", lat: 35.563, lng: 129.127 }),

  // —— 세종 ——
  hood({ label: "세종 아름동", city: "세종", name: "아름동", lat: 36.512, lng: 127.249, uniqueBare: true }),
  hood({ label: "세종 보람동", city: "세종", name: "보람동", lat: 36.478, lng: 127.289 }),
  hood({ label: "세종 도담동", city: "세종", name: "도담동", lat: 36.473, lng: 127.254 }),
  hood({ label: "세종 종촌동", city: "세종", name: "종촌동", lat: 36.495, lng: 127.245 }),

  // —— 기타 광역·도 ——
  hood({ label: "전주 완산 효자동", city: "전주", gu: "완산구", name: "효자동", lat: 35.82, lng: 127.12 }),
  hood({ label: "전주 덕진 송천동", city: "전주", gu: "덕진구", name: "송천동", lat: 35.842, lng: 127.142 }),
  hood({ label: "천안 서북 두정동", city: "천안", gu: "서북구", name: "두정동", lat: 36.835, lng: 127.13 }),
  hood({ label: "천안 서북 불당동", city: "천안", gu: "서북구", name: "불당동", lat: 36.808, lng: 127.108, uniqueBare: true }),
  hood({ label: "청주 흥덕 복대동", city: "청주", gu: "흥덕구", name: "복대동", lat: 36.635, lng: 127.489 }),
  hood({ label: "청주 서원 산남동", city: "청주", gu: "서원구", name: "산남동", lat: 36.608, lng: 127.481 }),
  hood({ label: "청주 청원 오창읍", city: "청주", gu: "청원구", name: "오창읍", lat: 36.715, lng: 127.431 }),
  hood({ label: "아산 배방읍", city: "아산", name: "배방읍", lat: 36.777, lng: 127.053 }),
  hood({ label: "당진 당진동", city: "당진", name: "당진동", lat: 36.894, lng: 126.63 }),
  hood({ label: "창원 성산 상남동", city: "창원", gu: "성산구", name: "상남동", lat: 35.225, lng: 128.681 }),
  hood({ label: "김해 삼계동", city: "김해", name: "삼계동", lat: 35.234, lng: 128.889 }),
  hood({ label: "양산 물금읍", city: "양산", name: "물금읍", lat: 35.338, lng: 129.034 }),
  hood({ label: "거제 고현동", city: "거제", name: "고현동", lat: 34.88, lng: 128.621 }),
  hood({ label: "진주 충무공동", city: "진주", name: "충무공동", lat: 35.18, lng: 128.107 }),
  hood({ label: "포항 남구 이동", city: "포항", gu: "남구", name: "이동", lat: 36.019, lng: 129.343 }),
  hood({ label: "구미 인동동", city: "구미", name: "인동동", lat: 36.119, lng: 128.344 }),
  hood({ label: "구미 산동읍", city: "구미", name: "산동읍", lat: 36.219, lng: 128.344 }),
  hood({ label: "안동 옥동", city: "안동", name: "옥동", lat: 36.568, lng: 128.729 }),
  hood({ label: "춘천 석사동", city: "춘천", name: "석사동", lat: 37.881, lng: 127.73 }),
  hood({ label: "순천 조례동", city: "순천", name: "조례동", lat: 34.95, lng: 127.487 }),
  hood({ label: "목포 옥암동", city: "목포", name: "옥암동", lat: 34.812, lng: 126.392 }),
  hood({ label: "군산 수송동", city: "군산", name: "수송동", lat: 35.967, lng: 126.736 }),
  hood({ label: "익산 영등동", city: "익산", name: "영등동", lat: 35.948, lng: 126.958 }),
  hood({ label: "제주 연동", city: "제주", name: "연동", lat: 33.486, lng: 126.498, uniqueBare: true }),
  hood({ label: "제주 노형동", city: "제주", name: "노형동", lat: 33.482, lng: 126.481 }),
  hood({ label: "제주 아라동", city: "제주", name: "아라동", lat: 33.468, lng: 126.542 }),
];

export function matchKoreaKnownNeighborhood(
  placeLabel: string,
): KoreaKnownPlace | null {
  const hay = normalizePlaceLabel(placeLabel);
  if (!hay) {
    return null;
  }
  for (const entry of KOREA_KNOWN_NEIGHBORHOODS) {
    if (entry.pattern.test(hay)) {
      return entry;
    }
  }
  return null;
}

export const KOREA_NEIGHBORHOOD_LABELS = KOREA_KNOWN_NEIGHBORHOODS.map(
  (row) => row.label,
);
