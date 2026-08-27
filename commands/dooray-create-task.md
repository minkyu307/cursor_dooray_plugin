---
name: dooray-create-task
description: 두레이 프로젝트에 업무를 생성한다
---

# 두레이 업무 생성

사용자에게 프로젝트, 제목, 본문, 담당자, 만기일을 확인한다.

1. 프로젝트 코드/이름으로 `dooray_list_projects`에서 project-id를 찾는다.
2. 담당자 이름이 있으면 `dooray_search_members`로 organizationMemberId를 찾는다.
3. `dooray_create_post`로 생성한다. 본문 mimeType은 `text/x-markdown`, 만기일이 있으면 ISO8601과 함께 `dueDateFlag=true`가 설정된다.
4. 생성된 post id와 제목을 보고한다.
