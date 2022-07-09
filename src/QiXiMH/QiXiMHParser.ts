import {
    Chapter,
    ChapterDetails,
    HomeSection,
    HomeSectionType,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
} from 'paperback-extensions-common'

export class Parser {
    parseMangaDetails($: any, mangaId: string): Manga {
        const title = $('div.cy_title').text().trim() ?? ''
        const image = $('div.cy_info_cover').find('img').attr('src') ?? ''
        const desc = $('p#comic-description').text().trim() ?? ''
        
        let tempInfo = $('.cy_xinxi').toArray()
        tempInfo = $('span', tempInfo[0])

        let artist = $(tempInfo[0]).text().replace('作者：', '').trim()

        let status = this.mangaStatus($(tempInfo[1]).text())

        return createManga({
            id: mangaId,
            titles: [title],
            image,
            status,
            artist,
            desc,
        })
    }

    mangaStatus(str: string) {
        if (str.includes('连载')) return MangaStatus.ONGOING
        if (str.includes('完结')) return MangaStatus.COMPLETED
        return MangaStatus.UNKNOWN
    }

    parseChapters($: any, apiData: JSON, mangaId: string, source: any): Chapter[] {
        const chapters: Chapter[] = []

        const arrChaptersHttp = $('ul#mh-chapter-list-ol-0 > li > a').toArray()

        for (const chapter of arrChaptersHttp) {
            const id = $(chapter).attr('href') ?? ''
            const chapterName = $(chapter).text()
            
            chapters.push(
                createChapter({
                    id,
                    mangaId,
                    name: chapterName,
                    chapNum: 0,
                    langCode: LanguageCode.CHINEESE,
                })
            )
        }

        Object.values(apiData).forEach(chapterInfo => {
            const chapterName = chapterInfo["chaptername"]
            chapters.push(
                createChapter({
                    id: `/${mangaId}${chapterInfo["chapterid"]}.html`,
                    mangaId,
                    name: chapterName,
                    chapNum: 0,
                    langCode: LanguageCode.CHINEESE
                })
            )
        })

        return chapters
    }

    parseChapterDetails($: any, mangaId: string, id: string): ChapterDetails {
        var pages = eval($('script')[3].children[0].data.replace("eval", ''))
        pages = pages.replace('var newImgs=', '').replaceAll('"', '').replace(/^\[|\]$/g, "").split(",")    
        return createChapterDetails({
            id,
            mangaId,
            pages,
            longStrip: true,
        })

    }

    parseSearchResults($: any): MangaTile[] {
        const results: MangaTile[] = []

        for (const item of $('div.cy_list_mh > ul > li > a.pic').toArray()) {
            const id = $(item).attr('href').replace('/', '') ?? ''
            const title = $(item).find('img').attr('alt').slice(0, -2).trim() ?? ''
            const image = $(item).find('img').attr('src') ?? ''
            results.push(
                createMangaTile({
                    id,
                    image,
                    title: createIconText({ text: title }),
                })
            )
        }
        return results
    }

    parseViewMore($: any): MangaTile[] {
        const more: MangaTile[] = []
        for (const item of $('.listupd .bsx').toArray()) {
            const id = $('a', item).attr('href')?.replace('https://flamescans.org/series/', '').replace('/', '') ?? ''
            const title = $('a', item).attr('title').trim() ?? ''
            const image = $('img', item).attr('src') ?? ''
            more.push(
                createMangaTile({
                    id,
                    image,
                    title: createIconText({ text: title }),
                })
            )
        }
        return more
    }

    parseHomeSections($: any, sectionCallback: (section: HomeSection) => void): void {
        const section1 = createHomeSection({ id: '1', title: '今日热读', type: HomeSectionType.singleRowNormal, view_more: false, })
        const section2 = createHomeSection({ id: '2', title: '新番漫画', type: HomeSectionType.singleRowNormal, view_more: true, })
        const section3 = createHomeSection({ id: '3', title: '最近更新', type: HomeSectionType.singleRowNormal, view_more: true, })

        const daily: MangaTile[] = []
        const newManhua: MangaTile[] = []
        const recentlyUpdate: MangaTile[] = []

        const cy_wide_list = $('div.cy_wide_list').toArray()

        const arrDaily = $(cy_wide_list[0]).find('li > a').toArray()
        const arrNewManhua = $(cy_wide_list[1]).find('li > a').toArray()
        const arrRecentlyUpdate = $(cy_wide_list[2]).find('li > a').toArray()

        for (const obj of arrDaily) {
            const id = $(obj).attr('href').replace('/', '')
            const image = $(obj).find('img').attr('src')
            const title = $(obj).find('img').attr('alt').trim()
            daily.push(
                createMangaTile({
                    id,
                    image,
                    title: createIconText({ text: title })
                })
            )
        }

        section1.items = daily
        sectionCallback(section1)


        for (const obj of arrNewManhua) {
            const id = $(obj).attr('href').replace('/', '')
            const image = $(obj).find('img').attr('src')
            const title = $(obj).find('img').attr('alt').trim()
            newManhua.push(
                createMangaTile({
                    id,
                    image,
                    title: createIconText({ text: title })
                })
            )
        }
        section2.items = newManhua
        sectionCallback(section2)

        for (const obj of arrRecentlyUpdate) {
            const id = $(obj).attr('href').replace('/', '')
            const image = $(obj).find('img').attr('src')
            const title = $(obj).find('img').attr('alt').trim()
            recentlyUpdate.push(
                createMangaTile({
                    id,
                    image,
                    title: createIconText({ text: title })
                })
            )
        }
        section3.items = recentlyUpdate
        sectionCallback(section3)
    }
}
