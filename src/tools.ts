import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DoorayClient, isDestructiveRequest, type HttpMethod } from "./client.ts";
import { formatEndpointCatalog } from "./catalog.ts";
import { compactQuery, registerJsonTool, toMemberUsers } from "./mcp-util.ts";

const page = z.number().int().min(0).optional();
const size = z.number().int().min(1).max(100).optional();
const id = z.string().min(1);
const mimeType = z.enum(["text/x-markdown", "text/html"]).optional();
const priority = z.enum(["highest", "high", "normal", "low", "lowest", "none"]).optional();

/**
 * 공식 서비스 API HTML에 정의된 Dooray 엔드포인트를 MCP 도구로 등록한다.
 */
export function registerDoorayTools(server: McpServer, client: DoorayClient): void {
  registerCatalogTools(server);
  registerCommonTools(server, client);
  registerProjectTools(server, client);
  registerPostTools(server, client);
  registerCalendarTools(server, client);
  registerMessengerTools(server, client);
  registerWikiTools(server, client);
  registerDriveTools(server, client);
  registerReservationTools(server, client);
  registerContactTools(server, client);
  registerGenericTool(server, client);
}

function registerCatalogTools(server: McpServer): void {
  registerJsonTool(
    server,
    "dooray_list_api_catalog",
    "공식 Dooray 서비스 API HTML에 수록된 REST 엔드포인트 목록을 반환합니다. 문서에 있는 API를 호출하기 전에 경로를 확인할 때 사용하세요.",
    {},
    async () => formatEndpointCatalog(),
  );
}

function registerCommonTools(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_get_me",
    "개인 인증 토큰에 해당하는 내 멤버 정보를 조회합니다. GET /common/v1/members/me",
    {},
    async () => client.request({ method: "GET", path: "/common/v1/members/me" }),
  );

  registerJsonTool(
    server,
    "dooray_search_members",
    "조직 멤버를 검색합니다. GET /common/v1/members. 공식 문서는 externalEmailAddresses를 필수로 안내하지만 name, userCode 필터도 함께 전달할 수 있습니다.",
    {
      externalEmailAddresses: z.string().optional().describe("외부 이메일. 정확히 일치. 쉼표로 여러 개"),
      name: z.string().optional().describe("사용자 이름"),
      userCode: z.string().optional().describe("사용자 ID like 검색"),
      userCodeExact: z.string().optional().describe("사용자 ID 정확 일치"),
      idProviderUserId: z.string().optional().describe("SSO 사용자 ID"),
      page,
      size,
    },
    async (args) => {
      const query = compactQuery({
        externalEmailAddresses: args.externalEmailAddresses,
        name: args.name,
        userCode: args.userCode,
        userCodeExact: args.userCodeExact,
        idProviderUserId: args.idProviderUserId,
        page: args.page,
        size: args.size,
      });
      if (Object.keys(query).length === 0) {
        throw new Error("멤버 검색 조건이 필요합니다. externalEmailAddresses, name, userCode 중 하나 이상을 지정하세요.");
      }
      return client.request({ method: "GET", path: "/common/v1/members", query });
    },
  );

  registerJsonTool(
    server,
    "dooray_get_member",
    "멤버 상세를 조회합니다. GET /common/v1/members/{member-id}",
    { memberId: id.describe("Dooray organization member id") },
    async (args) =>
      client.request({ method: "GET", path: `/common/v1/members/${String(args.memberId)}` }),
  );

  registerJsonTool(
    server,
    "dooray_list_streams",
    "알림 스트림을 조회합니다. GET /common/v1/streams",
    {
      size,
      before: z.string().optional().describe("이전 응답 cursor"),
      read: z.boolean().optional().describe("읽음 여부 필터"),
    },
    async (args) =>
      client.request({
        method: "GET",
        path: "/common/v1/streams",
        query: compactQuery({ size: args.size, before: args.before, read: args.read }),
      }),
  );
}

function registerProjectTools(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_list_projects",
    "접근 가능한 프로젝트 목록을 조회합니다. GET /project/v1/projects. 내가 속한 프로젝트만 보려면 member=me.",
    {
      member: z.literal("me").optional().describe("me이면 내가 속한 프로젝트만"),
      page,
      size,
      type: z.enum(["private", "public"]).optional().describe("미지정 시 public"),
      scope: z.enum(["private", "public"]).optional(),
      state: z.enum(["active", "archived", "deleted"]).optional(),
    },
    async (args) =>
      client.request({
        method: "GET",
        path: "/project/v1/projects",
        query: compactQuery({
          member: args.member,
          page: args.page,
          size: args.size,
          type: args.type,
          scope: args.scope,
          state: args.state,
        }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_get_project",
    "프로젝트 상세를 조회합니다. GET /project/v1/projects/{project-id}",
    { projectId: id },
    async (args) =>
      client.request({ method: "GET", path: `/project/v1/projects/${String(args.projectId)}` }),
  );

  registerJsonTool(
    server,
    "dooray_create_project",
    "프로젝트를 생성합니다. POST /project/v1/projects",
    {
      code: z.string().min(1).describe("화면에 보이는 프로젝트 명"),
      description: z.string().optional(),
      scope: z.enum(["private", "public"]).optional(),
      projectCategoryId: z.string().optional(),
    },
    async (args) =>
      client.request({
        method: "POST",
        path: "/project/v1/projects",
        body: compactQuery({
          code: args.code,
          description: args.description,
          scope: args.scope ?? "private",
          projectCategoryId: args.projectCategoryId,
        }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_list_project_categories",
    "프로젝트 카테고리 목록을 조회합니다. GET /project/v1/project-categories",
    {},
    async () => client.request({ method: "GET", path: "/project/v1/project-categories" }),
  );

  registerJsonTool(
    server,
    "dooray_list_workflows",
    "프로젝트 워크플로(상태) 목록을 조회합니다. GET /project/v1/projects/{project-id}/workflows",
    { projectId: id },
    async (args) =>
      client.request({
        method: "GET",
        path: `/project/v1/projects/${String(args.projectId)}/workflows`,
      }),
  );

  registerJsonTool(
    server,
    "dooray_list_tags",
    "프로젝트 태그 목록을 조회합니다. GET /project/v1/projects/{project-id}/tags",
    { projectId: id, page, size },
    async (args) =>
      client.request({
        method: "GET",
        path: `/project/v1/projects/${String(args.projectId)}/tags`,
        query: compactQuery({ page: args.page, size: args.size }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_create_tag",
    "프로젝트 태그를 생성합니다. POST /project/v1/projects/{project-id}/tags",
    { projectId: id, name: z.string().min(1), color: z.string().optional() },
    async (args) =>
      client.request({
        method: "POST",
        path: `/project/v1/projects/${String(args.projectId)}/tags`,
        body: compactQuery({ name: args.name, color: args.color }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_list_milestones",
    "마일스톤(단계) 목록을 조회합니다. GET /project/v1/projects/{project-id}/milestones",
    {
      projectId: id,
      page,
      size,
      status: z.enum(["open", "closed"]).optional(),
    },
    async (args) =>
      client.request({
        method: "GET",
        path: `/project/v1/projects/${String(args.projectId)}/milestones`,
        query: compactQuery({ page: args.page, size: args.size, status: args.status }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_create_milestone",
    "마일스톤을 생성합니다. POST /project/v1/projects/{project-id}/milestones",
    {
      projectId: id,
      name: z.string().min(1),
      startedAt: z.string().optional(),
      endedAt: z.string().optional(),
    },
    async (args) =>
      client.request({
        method: "POST",
        path: `/project/v1/projects/${String(args.projectId)}/milestones`,
        body: compactQuery({
          name: args.name,
          startedAt: args.startedAt,
          endedAt: args.endedAt,
        }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_update_milestone",
    "마일스톤을 수정합니다. PUT /project/v1/projects/{project-id}/milestones/{milestone-id}",
    {
      projectId: id,
      milestoneId: id,
      name: z.string().optional(),
      status: z.enum(["open", "closed"]).optional(),
      startedAt: z.string().optional(),
      endedAt: z.string().optional(),
    },
    async (args) =>
      client.request({
        method: "PUT",
        path: `/project/v1/projects/${String(args.projectId)}/milestones/${String(args.milestoneId)}`,
        body: compactQuery({
          name: args.name,
          status: args.status,
          startedAt: args.startedAt,
          endedAt: args.endedAt,
        }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_delete_milestone",
    "마일스톤을 삭제합니다. DELETE /project/v1/projects/{project-id}/milestones/{milestone-id}",
    { projectId: id, milestoneId: id, confirm: z.literal(true) },
    async (args) => {
      requireConfirm(args.confirm);
      return client.request({
        method: "DELETE",
        path: `/project/v1/projects/${String(args.projectId)}/milestones/${String(args.milestoneId)}`,
      });
    },
  );

  registerJsonTool(
    server,
    "dooray_list_project_members",
    "프로젝트 멤버를 조회합니다. GET /project/v1/projects/{project-id}/members",
    {
      projectId: id,
      page,
      size,
      roles: z.string().optional().describe("admin, member. 미지정 시 모두"),
    },
    async (args) =>
      client.request({
        method: "GET",
        path: `/project/v1/projects/${String(args.projectId)}/members`,
        query: compactQuery({ page: args.page, size: args.size, roles: args.roles }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_add_project_member",
    "프로젝트에 멤버를 추가합니다. POST /project/v1/projects/{project-id}/members. body는 organizationMemberId, role.",
    {
      projectId: id,
      organizationMemberId: id,
      role: z.enum(["admin", "member"]).optional(),
    },
    async (args) =>
      client.request({
        method: "POST",
        path: `/project/v1/projects/${String(args.projectId)}/members`,
        body: {
          organizationMemberId: args.organizationMemberId,
          role: args.role ?? "member",
        },
      }),
  );

  registerJsonTool(
    server,
    "dooray_list_templates",
    "업무 템플릿 목록을 조회합니다. GET /project/v1/projects/{project-id}/templates",
    { projectId: id, page, size },
    async (args) =>
      client.request({
        method: "GET",
        path: `/project/v1/projects/${String(args.projectId)}/templates`,
        query: compactQuery({ page: args.page, size: args.size }),
      }),
  );
}

function registerPostTools(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_list_posts",
    "프로젝트 업무 목록을 조회합니다. GET /project/v1/projects/{project-id}/posts",
    {
      projectId: id,
      page,
      size,
      toMemberIds: z.string().optional().describe("담당자 organizationMemberId, 쉼표 구분"),
      fromMemberIds: z.string().optional(),
      ccMemberIds: z.string().optional(),
      toMemberSize: z.number().int().min(0).max(1).optional(),
      tagIds: z.string().optional(),
      parentPostId: z.string().optional(),
      postNumber: z.string().optional(),
      postWorkflowClasses: z.string().optional().describe("backlog,registered,working,closed"),
      postWorkflowIds: z.string().optional(),
      milestoneIds: z.string().optional(),
      subjects: z.string().optional(),
      createdAt: z.string().optional().describe("today | thisweek | prev-{N}d | ISO8601 range"),
      updatedAt: z.string().optional(),
      dueAt: z.string().optional(),
      order: z.string().optional().describe("createdAt | postDueAt | postUpdatedAt, 역순은 - 접두"),
    },
    async (args) =>
      client.request({
        method: "GET",
        path: `/project/v1/projects/${String(args.projectId)}/posts`,
        query: compactQuery({
          page: args.page,
          size: args.size,
          toMemberIds: args.toMemberIds,
          fromMemberIds: args.fromMemberIds,
          ccMemberIds: args.ccMemberIds,
          toMemberSize: args.toMemberSize,
          tagIds: args.tagIds,
          parentPostId: args.parentPostId,
          postNumber: args.postNumber,
          postWorkflowClasses: args.postWorkflowClasses,
          postWorkflowIds: args.postWorkflowIds,
          milestoneIds: args.milestoneIds,
          subjects: args.subjects,
          createdAt: args.createdAt,
          updatedAt: args.updatedAt,
          dueAt: args.dueAt,
          order: args.order,
        }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_get_post",
    "업무 상세를 조회합니다. GET /project/v1/projects/{project-id}/posts/{post-id}",
    { projectId: id, postId: id },
    async (args) =>
      client.request({
        method: "GET",
        path: `/project/v1/projects/${String(args.projectId)}/posts/${String(args.postId)}`,
      }),
  );

  registerJsonTool(
    server,
    "dooray_create_post",
    "업무를 생성합니다. POST /project/v1/projects/{project-id}/posts",
    {
      projectId: id,
      subject: z.string().min(1),
      body: z.string().optional(),
      bodyMimeType: mimeType,
      toMemberIds: z.array(z.string()).optional(),
      ccMemberIds: z.array(z.string()).optional(),
      dueDate: z.string().optional().describe("ISO8601"),
      milestoneId: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      priority,
      parentPostId: z.string().optional(),
    },
    async (args) => {
      const body: Record<string, unknown> = { subject: args.subject };
      if (args.body) {
        body.body = {
          mimeType: args.bodyMimeType ?? "text/x-markdown",
          content: args.body,
        };
      }
      const users = toMemberUsers(asStringArray(args.toMemberIds), asStringArray(args.ccMemberIds));
      if (users) {
        body.users = users;
      }
      if (args.dueDate) {
        body.dueDate = args.dueDate;
        body.dueDateFlag = true;
      }
      if (args.milestoneId) {
        body.milestoneId = args.milestoneId;
      }
      if (Array.isArray(args.tagIds) && args.tagIds.length > 0) {
        body.tagIds = args.tagIds;
      }
      if (args.priority) {
        body.priority = args.priority;
      }
      if (args.parentPostId) {
        body.parentPostId = args.parentPostId;
      }
      return client.request({
        method: "POST",
        path: `/project/v1/projects/${String(args.projectId)}/posts`,
        body,
      });
    },
  );

  registerJsonTool(
    server,
    "dooray_update_post",
    "업무를 수정합니다. PUT /project/v1/projects/{project-id}/posts/{post-id}",
    {
      projectId: id,
      postId: id,
      subject: z.string().optional(),
      body: z.string().optional(),
      bodyMimeType: mimeType,
      dueDate: z.string().optional(),
      milestoneId: z.string().optional(),
      priority,
    },
    async (args) => {
      const body: Record<string, unknown> = {};
      if (args.subject) {
        body.subject = args.subject;
      }
      if (args.body) {
        body.body = {
          mimeType: args.bodyMimeType ?? "text/x-markdown",
          content: args.body,
        };
      }
      if (args.dueDate) {
        body.dueDate = args.dueDate;
        body.dueDateFlag = true;
      }
      if (args.milestoneId) {
        body.milestoneId = args.milestoneId;
      }
      if (args.priority) {
        body.priority = args.priority;
      }
      return client.request({
        method: "PUT",
        path: `/project/v1/projects/${String(args.projectId)}/posts/${String(args.postId)}`,
        body,
      });
    },
  );

  registerJsonTool(
    server,
    "dooray_set_post_workflow",
    "업무 상태를 변경합니다. POST .../posts/{post-id}/set-workflow",
    { projectId: id, postId: id, workflowId: id },
    async (args) =>
      client.request({
        method: "POST",
        path: `/project/v1/projects/${String(args.projectId)}/posts/${String(args.postId)}/set-workflow`,
        body: { workflowId: args.workflowId },
      }),
  );

  registerJsonTool(
    server,
    "dooray_set_post_done",
    "업무를 완료 그룹의 대표 상태로 변경합니다. POST .../posts/{post-id}/set-done",
    { projectId: id, postId: id },
    async (args) =>
      client.request({
        method: "POST",
        path: `/project/v1/projects/${String(args.projectId)}/posts/${String(args.postId)}/set-done`,
        body: {},
      }),
  );

  registerJsonTool(
    server,
    "dooray_set_parent_post",
    "상위 업무를 지정합니다. POST .../posts/{post-id}/set-parent-post",
    { projectId: id, postId: id, parentPostId: id },
    async (args) =>
      client.request({
        method: "POST",
        path: `/project/v1/projects/${String(args.projectId)}/posts/${String(args.postId)}/set-parent-post`,
        body: { parentPostId: args.parentPostId },
      }),
  );

  registerJsonTool(
    server,
    "dooray_list_comments",
    "업무 댓글 목록을 조회합니다. GET .../posts/{post-id}/logs",
    {
      projectId: id,
      postId: id,
      page,
      size,
      order: z.string().optional().describe("createdAt 또는 -createdAt"),
    },
    async (args) =>
      client.request({
        method: "GET",
        path: `/project/v1/projects/${String(args.projectId)}/posts/${String(args.postId)}/logs`,
        query: compactQuery({ page: args.page, size: args.size, order: args.order }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_add_comment",
    "업무 댓글을 작성합니다. POST .../posts/{post-id}/logs",
    {
      projectId: id,
      postId: id,
      content: z.string().min(1),
      mimeType,
    },
    async (args) =>
      client.request({
        method: "POST",
        path: `/project/v1/projects/${String(args.projectId)}/posts/${String(args.postId)}/logs`,
        body: {
          body: {
            mimeType: args.mimeType ?? "text/x-markdown",
            content: args.content,
          },
        },
      }),
  );

  registerJsonTool(
    server,
    "dooray_update_comment",
    "업무 댓글을 수정합니다. PUT .../logs/{log-id}",
    { projectId: id, postId: id, logId: id, content: z.string().min(1), mimeType },
    async (args) =>
      client.request({
        method: "PUT",
        path: `/project/v1/projects/${String(args.projectId)}/posts/${String(args.postId)}/logs/${String(args.logId)}`,
        body: {
          body: {
            mimeType: args.mimeType ?? "text/x-markdown",
            content: args.content,
          },
        },
      }),
  );

  registerJsonTool(
    server,
    "dooray_delete_comment",
    "업무 댓글을 삭제합니다. DELETE .../logs/{log-id}",
    { projectId: id, postId: id, logId: id, confirm: z.literal(true) },
    async (args) => {
      requireConfirm(args.confirm);
      return client.request({
        method: "DELETE",
        path: `/project/v1/projects/${String(args.projectId)}/posts/${String(args.postId)}/logs/${String(args.logId)}`,
      });
    },
  );
}

function registerCalendarTools(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_list_calendars",
    "캘린더 목록을 조회합니다. GET /calendar/v1/calendars. 구독 캘린더는 응답하지 않습니다.",
    { page, size },
    async (args) =>
      client.request({
        method: "GET",
        path: "/calendar/v1/calendars",
        query: compactQuery({ page: args.page, size: args.size }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_get_calendar",
    "캘린더 상세를 조회합니다. GET /calendar/v1/calendars/{calendar-id}",
    { calendarId: id },
    async (args) =>
      client.request({ method: "GET", path: `/calendar/v1/calendars/${String(args.calendarId)}` }),
  );

  registerJsonTool(
    server,
    "dooray_list_events",
    "일정 목록을 조회합니다. GET /calendar/v1/calendars/*/events. timeMin, timeMax 필수. 최대 1년.",
    {
      timeMin: z.string().min(1).describe("ISO8601 inclusive"),
      timeMax: z.string().min(1).describe("ISO8601 exclusive"),
      calendars: z.string().optional().describe("calendarId 목록, 쉼표 구분"),
      postType: z.enum(["toMe", "toCcMe", "fromToCcMe"]).optional(),
      category: z.enum(["general", "post", "milestone"]).optional(),
    },
    async (args) =>
      client.request({
        method: "GET",
        path: "/calendar/v1/calendars/*/events",
        query: compactQuery({
          timeMin: args.timeMin,
          timeMax: args.timeMax,
          calendars: args.calendars,
          postType: args.postType,
          category: args.category,
        }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_get_event",
    "일정 상세를 조회합니다. GET /calendar/v1/calendars/{calendar-id}/events/{event-id}",
    { calendarId: id, eventId: id },
    async (args) =>
      client.request({
        method: "GET",
        path: `/calendar/v1/calendars/${String(args.calendarId)}/events/${String(args.eventId)}`,
      }),
  );

  registerJsonTool(
    server,
    "dooray_create_event",
    "일정을 등록합니다. POST /calendar/v1/calendars/{calendar-id}/events",
    {
      calendarId: id,
      subject: z.string().min(1),
      startedAt: z.string().min(1),
      endedAt: z.string().min(1),
      location: z.string().optional(),
      body: z.string().optional(),
      wholeDayFlag: z.boolean().optional(),
      toMemberIds: z.array(z.string()).optional(),
      ccMemberIds: z.array(z.string()).optional(),
    },
    async (args) => {
      const payload: Record<string, unknown> = {
        subject: args.subject,
        startedAt: args.startedAt,
        endedAt: args.endedAt,
        wholeDayFlag: args.wholeDayFlag ?? false,
      };
      if (args.location) {
        payload.location = args.location;
      }
      if (args.body) {
        payload.body = { mimeType: "text/html", content: args.body };
      }
      const users = toMemberUsers(asStringArray(args.toMemberIds), asStringArray(args.ccMemberIds));
      if (users) {
        payload.users = users;
      }
      return client.request({
        method: "POST",
        path: `/calendar/v1/calendars/${String(args.calendarId)}/events`,
        body: payload,
      });
    },
  );

  registerJsonTool(
    server,
    "dooray_delete_event",
    "일정을 삭제합니다. POST /calendar/v1/calendars/{calendar-id}/events/{event-id}/delete",
    { calendarId: id, eventId: id, confirm: z.literal(true) },
    async (args) => {
      requireConfirm(args.confirm);
      return client.request({
        method: "POST",
        path: `/calendar/v1/calendars/${String(args.calendarId)}/events/${String(args.eventId)}/delete`,
        body: {},
      });
    },
  );
}

function registerMessengerTools(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_list_channels",
    "속한 메신저 대화방 목록을 조회합니다. GET /messenger/v1/channels",
    {},
    async () => client.request({ method: "GET", path: "/messenger/v1/channels" }),
  );

  registerJsonTool(
    server,
    "dooray_create_channel",
    "대화방을 생성합니다. POST /messenger/v1/channels?idType=member-id",
    {
      title: z.string().min(1),
      memberIds: z.array(z.string()).min(1),
      type: z.enum(["private", "direct"]).optional(),
      capacity: z.number().int().optional(),
      idType: z.enum(["email", "member-id"]).optional(),
    },
    async (args) =>
      client.request({
        method: "POST",
        path: `/messenger/v1/channels?idType=${String(args.idType ?? "member-id")}`,
        body: compactQuery({
          title: args.title,
          memberIds: args.memberIds,
          type: args.type ?? "private",
          capacity: args.capacity,
        }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_send_direct_message",
    "1:1 메시지를 전송합니다. POST /messenger/v1/channels/direct-send",
    {
      organizationMemberId: id.describe("수신자 멤버 ID"),
      text: z.string().min(1),
    },
    async (args) =>
      client.request({
        method: "POST",
        path: "/messenger/v1/channels/direct-send",
        body: {
          organizationMemberId: args.organizationMemberId,
          text: args.text,
        },
      }),
  );

  registerJsonTool(
    server,
    "dooray_send_channel_message",
    "대화방에 메시지를 전송합니다. POST /messenger/v1/channels/{channel-id}/logs",
    { channelId: id, text: z.string().min(1) },
    async (args) =>
      client.request({
        method: "POST",
        path: `/messenger/v1/channels/${String(args.channelId)}/logs`,
        body: { text: args.text },
      }),
  );

  registerJsonTool(
    server,
    "dooray_join_channel_members",
    "대화방에 멤버를 초대합니다. POST /messenger/v1/channels/{channel-id}/members/join",
    { channelId: id, memberIds: z.array(z.string()).min(1) },
    async (args) =>
      client.request({
        method: "POST",
        path: `/messenger/v1/channels/${String(args.channelId)}/members/join`,
        body: { memberIds: args.memberIds },
      }),
  );

  registerJsonTool(
    server,
    "dooray_leave_channel_members",
    "대화방에서 멤버를 제거합니다. POST /messenger/v1/channels/{channel-id}/members/leave",
    { channelId: id, memberIds: z.array(z.string()).min(1) },
    async (args) =>
      client.request({
        method: "POST",
        path: `/messenger/v1/channels/${String(args.channelId)}/members/leave`,
        body: { memberIds: args.memberIds },
      }),
  );
}

function registerWikiTools(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_list_wikis",
    "접근 가능한 위키 목록을 조회합니다. GET /wiki/v1/wikis",
    { page, size },
    async (args) =>
      client.request({
        method: "GET",
        path: "/wiki/v1/wikis",
        query: compactQuery({ page: args.page, size: args.size }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_list_wiki_pages",
    "위키 페이지 목록을 조회합니다. GET /wiki/v1/wikis/{wiki-id}/pages",
    { wikiId: id, page, size },
    async (args) =>
      client.request({
        method: "GET",
        path: `/wiki/v1/wikis/${String(args.wikiId)}/pages`,
        query: compactQuery({ page: args.page, size: args.size }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_get_wiki_page",
    "위키 페이지 상세를 조회합니다. GET /wiki/v1/wikis/{wiki-id}/pages/{page-id}",
    { wikiId: id, pageId: id },
    async (args) =>
      client.request({
        method: "GET",
        path: `/wiki/v1/wikis/${String(args.wikiId)}/pages/${String(args.pageId)}`,
      }),
  );

  registerJsonTool(
    server,
    "dooray_create_wiki_page",
    "위키 페이지를 생성합니다. POST /wiki/v1/wikis/{wiki-id}/pages. 본문은 markdown.",
    {
      wikiId: id,
      subject: z.string().min(1),
      content: z.string().min(1),
      parentPageId: z.string().optional(),
    },
    async (args) =>
      client.request({
        method: "POST",
        path: `/wiki/v1/wikis/${String(args.wikiId)}/pages`,
        body: compactQuery({
          parentPageId: args.parentPageId,
          subject: args.subject,
          body: { mimeType: "text/x-markdown", content: args.content },
        }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_update_wiki_page",
    "위키 페이지 본문을 수정합니다. PUT /wiki/v1/wikis/{wiki-id}/pages/{page-id}/content",
    { wikiId: id, pageId: id, content: z.string().min(1) },
    async (args) =>
      client.request({
        method: "PUT",
        path: `/wiki/v1/wikis/${String(args.wikiId)}/pages/${String(args.pageId)}/content`,
        body: { body: { mimeType: "text/x-markdown", content: args.content } },
      }),
  );
}

function registerDriveTools(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_list_drives",
    "드라이브 목록을 조회합니다. GET /drive/v1/drives",
    {
      type: z.enum(["private", "project"]).optional(),
      scope: z.enum(["private", "public"]).optional(),
    },
    async (args) =>
      client.request({
        method: "GET",
        path: "/drive/v1/drives",
        query: compactQuery({ type: args.type, scope: args.scope }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_list_drive_files",
    "드라이브 파일/폴더 목록을 조회합니다. GET /drive/v1/drives/{drive-id}/files",
    { driveId: id, parentId: z.string().optional(), page, size },
    async (args) =>
      client.request({
        method: "GET",
        path: `/drive/v1/drives/${String(args.driveId)}/files`,
        query: compactQuery({ parentId: args.parentId, page: args.page, size: args.size }),
      }),
  );
}

function registerReservationTools(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_list_resources",
    "예약 자원을 조회합니다. GET /reservation/v1/resources",
    { resourceCategoryId: z.string().optional() },
    async (args) =>
      client.request({
        method: "GET",
        path: "/reservation/v1/resources",
        query: compactQuery({ resourceCategoryId: args.resourceCategoryId }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_list_reservations",
    "자원 예약을 조회합니다. GET /reservation/v1/resource-reservations. timeMin, timeMax 필수.",
    {
      timeMin: z.string().min(1),
      timeMax: z.string().min(1),
      resourceIds: z.string().optional(),
      page,
      size,
    },
    async (args) =>
      client.request({
        method: "GET",
        path: "/reservation/v1/resource-reservations",
        query: compactQuery({
          timeMin: args.timeMin,
          timeMax: args.timeMax,
          resourceIds: args.resourceIds,
          page: args.page,
          size: args.size,
        }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_create_reservation",
    "자원을 예약합니다. POST /reservation/v1/resource-reservations",
    {
      resourceId: id,
      subject: z.string().min(1),
      startedAt: z.string().min(1),
      endedAt: z.string().min(1),
      wholeDayFlag: z.boolean().optional(),
    },
    async (args) =>
      client.request({
        method: "POST",
        path: "/reservation/v1/resource-reservations",
        body: {
          resourceId: args.resourceId,
          subject: args.subject,
          startedAt: args.startedAt,
          endedAt: args.endedAt,
          wholeDayFlag: args.wholeDayFlag ?? false,
        },
      }),
  );
}

function registerContactTools(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_list_contacts",
    "내 주소록을 조회합니다. GET /contacts/v1/contacts",
    { page, size },
    async (args) =>
      client.request({
        method: "GET",
        path: "/contacts/v1/contacts",
        query: compactQuery({ page: args.page, size: args.size }),
      }),
  );

  registerJsonTool(
    server,
    "dooray_search_contacts",
    "주소록을 검색합니다. POST /contacts/v1/contacts/search. 공식 body는 { all: [검색어] }.",
    { query: z.string().min(1) },
    async (args) =>
      client.request({
        method: "POST",
        path: "/contacts/v1/contacts/search",
        body: { all: [args.query] },
      }),
  );
}

function registerGenericTool(server: McpServer, client: DoorayClient): void {
  registerJsonTool(
    server,
    "dooray_api_call",
    "공식 서비스 API 경로를 직접 호출합니다. 전용 도구가 없는 엔드포인트(위키 댓글, 드라이브 공유 링크, Incoming Hook 등)에 사용하세요. path는 /project/v1/... 형식.",
    {
      method: z.enum(["GET", "POST", "PUT", "DELETE"]),
      path: z.string().min(1).describe("예: /project/v1/projects/{project-id}/hooks"),
      query: z.record(z.unknown()).optional(),
      body: z.unknown().optional(),
      confirm: z.boolean().optional().describe("DELETE 및 /delete, /set-archive 호출 시 true 필요"),
    },
    async (args) => {
      const method = args.method as HttpMethod;
      const path = String(args.path);
      if (isDestructiveRequest(method, path) && args.confirm !== true) {
        throw new Error("파괴적 요청입니다. 대상 경로를 확인한 뒤 confirm=true로 다시 호출하세요.");
      }
      return client.request({
        method,
        path,
        query: isRecord(args.query) ? args.query : undefined,
        body: args.body,
      });
    },
  );
}

function requireConfirm(confirm: unknown): void {
  if (confirm !== true) {
    throw new Error("삭제 요청입니다. 대상을 확인한 뒤 confirm=true로 다시 호출하세요.");
  }
}

function asStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map(String);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
