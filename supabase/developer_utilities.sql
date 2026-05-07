with utility_rows (id, title, description, url, image_url, visible, sort_order) as (
  values
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c001'::uuid,
      'Diff',
      '텍스트를 라인 단위와 문자 단위로 비교해 변경점을 빠르게 확인하는 문서 비교 유틸리티입니다.',
      '/diff',
      '/images/utilities/diff-preview.svg',
      true,
      1
    ),
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c002'::uuid,
      'Diagram Previewer',
      'Mermaid, PlantUML, Markdown 문서 안의 다이어그램을 브라우저에서 바로 렌더링하고 미리보는 유틸리티입니다.',
      '/diagram',
      '/images/utilities/diagram-preview.svg',
      true,
      2
    ),
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c006'::uuid,
      'Calendar Memo',
      '월별 달력, 한국 공휴일 정보, 날짜별 메모를 함께 관리하는 브라우저 캘린더 유틸리티입니다.',
      '/calendar',
      '/images/utilities/calendar-preview.svg',
      true,
      3
    ),
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c003'::uuid,
      'Tetris',
      '고스트 블록, Hold, Next 큐, 여러 게임 모드와 글로벌 리더보드를 지원하는 브라우저 테트리스 게임입니다.',
      '/tetris',
      '/images/utilities/tetris-preview.svg',
      true,
      4
    ),
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c007'::uuid,
      'Ladder Game',
      '참가자와 결과를 입력해 랜덤 사다리로 매칭하고, 애니메이션 경로와 브라우저 기록으로 결과를 다시 확인하는 유틸리티입니다.',
      '/ladder',
      '/images/utilities/ladder-preview.svg',
      true,
      5
    ),
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c101'::uuid,
      'Codec Toolkit',
      'JSON 포맷팅, URL 인코딩, Base64 변환, JWT 페이로드 확인을 한 화면에서 처리하는 개발자 유틸리티입니다.',
      '/codec',
      '/images/utilities/codec-preview.svg',
      true,
      6
    ),
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c102'::uuid,
      'Korean Text Repair',
      'UTF-8, CP949, EUC-KR, Windows-1252, URI 인코딩 문제로 깨진 한글 텍스트의 복구 후보를 찾아주는 유틸리티입니다.',
      '/mojibake',
      '/images/utilities/mojibake-preview.svg',
      true,
      7
    ),
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c103'::uuid,
      'Time Converter',
      'Unix timestamp, ISO 날짜, 로컬 시간, UTC, KST와 주요 시간대를 변환하고 날짜 계산을 돕는 시간 유틸리티입니다.',
      '/time',
      '/images/utilities/time-preview.svg',
      true,
      8
    ),
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c104'::uuid,
      'Regex Tester',
      'JavaScript 정규식을 테스트하고 매치 하이라이트, 캡처 그룹, 치환 결과를 바로 확인하는 정규식 유틸리티입니다.',
      '/regex',
      '/images/utilities/regex-preview.svg',
      true,
      9
    ),
    (
      '9b1d2f0c-2d1f-4f2e-9b42-c9e9a5f0c105'::uuid,
      'Table Converter',
      'CSV, TSV, Markdown 표, JSON 형식의 표 데이터를 서로 변환하고 미리보는 테이블 변환 유틸리티입니다.',
      '/table-converter',
      '/images/utilities/table-converter-preview.svg',
      true,
      10
    )
),
updated as (
  update public.visualizations as target
  set
    title = source.title,
    description = source.description,
    image_url = source.image_url,
    visible = source.visible,
    sort_order = source.sort_order
  from utility_rows as source
  where target.url = source.url
  returning target.url
)
insert into public.visualizations (id, title, description, url, image_url, visible, sort_order)
select source.id, source.title, source.description, source.url, source.image_url, source.visible, source.sort_order
from utility_rows as source
where not exists (
  select 1
  from updated
  where updated.url = source.url
)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  url = excluded.url,
  image_url = excluded.image_url,
  visible = excluded.visible,
  sort_order = excluded.sort_order;
