import {
    Chapter,
    ChapterDetails,
    ContentRating,
    HomeSection,
    Manga,
    MangaTile,
    PagedResults,
    SearchRequest,
    Request,
    Response,
    Source,
    SourceInfo,
    TagType,
    RequestManagerInfo,
} from 'paperback-extensions-common'

import { Parser } from './QiXiMHParser'

const QX_DOMAIN = 'http://www.qiximh1.com'

export const QiXiMHInfo: SourceInfo = {
    version: '0.0.0',
    name: 'QiXiMH',
    description: 'Extension for QiXiMH',
    author: 'woimoyu',
    authorWebsite: 'http://github.com/woimoyu/',
    icon: 'icon.png',
    contentRating: ContentRating.EVERYONE,
    websiteBaseURL: QX_DOMAIN,
    sourceTags: [
        {
            text: 'Chinese',
            type: TagType.GREY,
        }],
}

const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.5005.124 Safari/537.36 Edg/102.0.1245.44'

export class QiXiMH extends Source {
    baseUrl = QX_DOMAIN
    requestManager = createRequestManager({
        requestsPerSecond: 3,
        requestTimeout: 8000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {

                request.headers = {
                    ...(request.headers ?? {}),
                    ...{
                        'user-agent': userAgent,
                        'referer': `${this.baseUrl}/`
                    }
                }

                return request
            },

            interceptResponse: async (response: QXResponse): Promise<Response> => {
                response['fixedData'] = response.data ?? Buffer.from(createByteArray(response.rawData)).toString()
                return response
            }
        }
    }) as QXRequestManager

    RETRY = 5
    parser = new Parser()

    override getMangaShareUrl(mangaId: string): string {
        return `${this.baseUrl}/${mangaId}`
    }

    async getMangaDetails(mangaId: string): Promise<Manga> {
        const request = createRequestObject({
            url: `${this.baseUrl}/${mangaId}`,
            method: 'GET',
        })
        const response = await this.requestManager.schedule(request, this.RETRY)
        const $ = this.cheerio.load(response.data ?? response['fixedData'])
        console.log(">><<")
        console.log(`${this.baseUrl}/${mangaId}`)

        return this.parser.parseMangaDetails($, mangaId)
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const requestHttp = createRequestObject({
            url: `${this.baseUrl}/${mangaId}`,
            method: 'GET',
        })

        const requestAPI = createRequestObject({
            url: `${this.baseUrl}/bookchapter/`,
            method: 'POST',
            data: "id="+mangaId.replace('/','')+"&id2=1"
        })

        const responseHTTP = await this.requestManager.schedule(requestHttp, this.RETRY)
        const responseAPI = await this.requestManager.schedule(requestAPI, this.RETRY)

        let apiData
        try {
             apiData = JSON.parse(responseAPI.data)
        }
        catch (e) {
            throw new Error(`${e}`);
        }

        const $ = this.cheerio.load(responseHTTP.data ?? responseHTTP['fixedData'])
        return this.parser.parseChapters($, apiData, mangaId, this)
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        
        console.log(">>CC")
        console.log(`${this.baseUrl}${chapterId}`)

        const request = createRequestObject({
            url: `${this.baseUrl}${chapterId}`,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, this.RETRY)
        const $ = this.cheerio.load(response.data ?? response['fixedData'])
        console.log('>>CCC')
        console.log($('script').length)
        return this.parser.parseChapterDetails($, mangaId, chapterId)
    }


    async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        let page = metadata?.page ?? 1
        if (page == -1) return createPagedResults({ results: [], metadata: { page: -1 } })

        // const param = `/page/${page}/?s=${(query.title ?? '').replace(/\s/g, '+')}`
        // http://www.qiximh1.com/search.php?keyword=1+2
        const param = encodeURI(`?keyword=${(query.title ?? '').replace(/\s/g, '+')}`)
        console.log(">pp")
        console.log(param)

        const request = createRequestObject({
            url: `${this.baseUrl}/search.php`,
            param,
            method: 'GET',
        })


        // const request = createRequestObject({
        //     url: `${this.baseUrl}`,
        //     method: 'GET',
        //     param,
        // })

        const data = await this.requestManager.schedule(request, this.RETRY)
        const $ = this.cheerio.load(data.data)
        const manga = this.parser.parseSearchResults($)

        console.log(">pp1")
        console.log(data)


        // page++
        // if (manga.length < 10) page = -1

        return createPagedResults({
            results: manga,
            metadata: { page: -1 },
        })
    }

    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const request = createRequestObject({
            url: `${this.baseUrl}`,
            method: 'GET',
        })
        const response = await this.requestManager.schedule(request, this.RETRY)
        const $ = this.cheerio.load(response.data ?? response['fixedData'])
        this.parser.parseHomeSections($, sectionCallback)
    }

    override async getViewMoreItems(homepageSectionId: string, metadata: any): Promise<PagedResults> {
        let page = metadata?.page ?? 1
        if (page == -1) return createPagedResults({ results: [], metadata: { page: -1 } })
        let url = ''
        if (homepageSectionId == '2') url = `${this.baseUrl}/?page=${page}&order=update`
        else if (homepageSectionId == '3') url = `${this.baseUrl}/?page=${page}?status=&type=&order=popular`
        const request = createRequestObject({
            url,
            method: 'GET',
        })

        const response = await this.requestManager.schedule(request, this.RETRY)
        const $ = this.cheerio.load(response.data ?? response['fixedData'])
        const manga: MangaTile[] = this.parser.parseViewMore($)

        page++
        if (manga.length < 10) page = -1

        return createPagedResults({
            results: manga,
            metadata: { page: page },
        })
    }

    /**
     * Parses a time string from a Madara source into a Date object.
     * Copied from Madara.ts made by gamefuzzy
     */
    protected convertTime(timeAgo: string): Date {
        let time: Date
        let trimmed = Number((/\d*/.exec(timeAgo) ?? [])[0])
        trimmed = trimmed == 0 && timeAgo.includes('a') ? 1 : trimmed
        if (timeAgo.includes('mins') || timeAgo.includes('minutes') || timeAgo.includes('minute')) {
            time = new Date(Date.now() - trimmed * 60000)
        } else if (timeAgo.includes('hours') || timeAgo.includes('hour')) {
            time = new Date(Date.now() - trimmed * 3600000)
        } else if (timeAgo.includes('days') || timeAgo.includes('day')) {
            time = new Date(Date.now() - trimmed * 86400000)
        } else if (timeAgo.includes('year') || timeAgo.includes('years')) {
            time = new Date(Date.now() - trimmed * 31556952000)
        } else {
            time = new Date(timeAgo)
        }

        return time
    }
}

// xOnlyFadi
export interface QXResponse extends Response {
    fixedData: string;
}
export interface QXRequestManager extends RequestManagerInfo {
    schedule: (request: Request, retryCount: number) => Promise<QXResponse>;
}


//special thanks to Netsky and xOnlyFadi and author of Qiximh.kt from tachiyomi-extensions