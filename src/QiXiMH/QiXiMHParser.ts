import {
    Chapter,
    ChapterDetails,
    HomeSection,
    HomeSectionType,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    Tag,
    TagSection,
} from 'paperback-extensions-common'

export class Parser {
    parseMangaDetails($: any, mangaId: string): Manga {
        const title = $('div.cy_title').text() ?? ''
        const image = $('div.cy_info_cover').find('img').attr('src') ?? ''

        console.log("<><><>")
        console.log(image)

        const desc = $('p#comic-description').text().trim() ?? ''
        const rating = '0'
        let status = MangaStatus.UNKNOWN, author = '', artist = ''

        for (const obj of $('.left-side .imptdt').toArray()) {
            const item = $('i', obj).text().trim()
            const type = $('h1', obj).text().trim()
            if (type.toLowerCase().includes('status')) status = this.mangaStatus(item.toLowerCase())
            else if (type.toLowerCase().includes('author')) author = item
            else if (type.toLowerCase().includes('artist')) artist = item
        }

        const arrayTags: Tag[] = []
        for (const obj of $('.mgen a').toArray()) {
            const id = $(obj).attr('href')?.replace('https://flamescans.org/genres/', '').replace('/', '') ?? ''
            const label = $(obj).text().trim()
            if (!id || !label) continue
            arrayTags.push({ id: id, label: label })
        }
        const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map((x) => createTag(x)) })]

        return createManga({
            id: mangaId,
            titles: [this.encodeText(title)],
            image,
            rating: Number(rating) ?? 0,
            status,
            artist,
            author,
            tags: tagSections,
            desc: this.encodeText(desc),
        })
    }

    mangaStatus(str: string) {
        if (str.includes('连载')) return MangaStatus.ONGOING
        if (str.includes('完结')) return MangaStatus.COMPLETED
        if (str.includes('haitus')) return MangaStatus.HIATUS
        if (str.includes('cancelled')) return MangaStatus.ABANDONED
        if (str.includes('coming')) return MangaStatus.ONGOING
        return MangaStatus.ONGOING
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
                    chapNum: Number(chapterName.replace(/\D/g, '') ?? 0),
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
                    chapNum: Number(chapterName.replace(/\D/g, '') ?? 0),
                    langCode: LanguageCode.CHINEESE
                })
            )
        })

        return chapters
    }

    parseChapterDetails($: any, mangaId: string, id: string): ChapterDetails {
        const pages: string[] = []

        const chapterList = $('#readerarea p img').toArray()
        for (const obj of chapterList) {
            const imageUrl = $(obj).attr('src')
            if (!imageUrl) continue
            pages.push(imageUrl.trim())
        }

        return createChapterDetails({
            id,
            mangaId,
            pages,
            longStrip: true,
        })
    }

    parseSearchResults($: any): MangaTile[] {
        const results: MangaTile[] = []

        for (const item of $('.listupd .bsx').toArray()) {
            const id = $('a', item).attr('href')?.replace('https://flamescans.org/series/', '').replace('/', '') ?? ''
            const title = $('a', item).attr('title') ?? ''
            const image = $('img', item).attr('src') ?? ''
            results.push(
                createMangaTile({
                    id,
                    image,
                    title: createIconText({ text: this.encodeText(title) }),
                })
            )
        }
        return results
    }

    parseViewMore($: any): MangaTile[] {
        const more: MangaTile[] = []
        for (const item of $('.listupd .bsx').toArray()) {
            const id = $('a', item).attr('href')?.replace('https://flamescans.org/series/', '').replace('/', '') ?? ''
            const title = $('a', item).attr('title') ?? ''
            const image = $('img', item).attr('src') ?? ''
            more.push(
                createMangaTile({
                    id,
                    image,
                    title: createIconText({ text: this.encodeText(title) }),
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
            const title = $(obj).find('img').attr('alt')
            console.log(">>>>>>>>")
            console.log(id)
            console.log(image)
            console.log(title)
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
            const title = $(obj).find('img').attr('alt')
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
            const title = $(obj).find('img').attr('alt')
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



    encodeText(str: string) {
        return str.replace(/&#([0-9]{1,4});/gi, function (_, numStr) {
            var num = parseInt(numStr, 10)
            return String.fromCharCode(num)
        })
    }
}
