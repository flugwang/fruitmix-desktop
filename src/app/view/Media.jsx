import React from 'react'
import Radium from 'radium'
import Debug from 'debug'
import { ipcRenderer } from 'electron'
import { TweenMax } from 'gsap'
import { IconButton } from 'material-ui'
import { blue800, indigo700, indigo500, teal500 } from 'material-ui/styles/colors'
import PhotoIcon from 'material-ui/svg-icons/image/photo'
import FileCreateNewFolder from 'material-ui/svg-icons/file/create-new-folder'
import AddAPhoto from 'material-ui/svg-icons/image/add-to-photos'
import NavigationMenu from 'material-ui/svg-icons/navigation/menu'

import Base from './Base'
import PhotoApp from '../photo/PhotoApp'
import { formatDate } from '../common/datetime'
import FlatButton from '../common/FlatButton'

const debug = Debug('component:viewModel:Media: ')
const parseDate = (date) => {
  if (!date) return 0
  const a = date.replace(/:|\s/g, '')
  return parseInt(a, 10)
}
const getName = (photo) => {
  if (!photo[1].metadata.exifDateTime) {
    return `IMG_UnkownDate-${photo[0].slice(0, 5).toUpperCase()}-PC.${photo[1].metadata.format}`
  }
  return `IMG-${photo[1].metadata.exifDateTime.split(/\s+/g)[0].replace(/[:\s]+/g, '')}-${photo[0].slice(0, 5).toUpperCase()}-PC.${photo[1].metadata.format}`
}

/* increase limit of listeners of EventEmitter */
ipcRenderer.setMaxListeners(1000)

class Media extends Base {
  constructor(ctx) {
    super(ctx)
    this.state = {
      media: [],
      preValue: [],
      selectedItems: [],
      shiftHoverItems: [],
      uploadMedia: false,
      shift: false
    }

    this.memoizeValue = { currentDigest: '', currentScrollTop: 0 }
    this.firstSelect = true

    this.height = 0
    this.width = 0
    this.allPhotos = []
    this.photoDates = []
    this.photoMapDates = []
    this.photoListWithSameDate = []
    this.allHeight = []
    this.rowHeightSum = 0
    this.indexHeightSum = []
    this.maxScrollTop = 0
    this.previousIndex = 1

    this.setPhotoInfo = (height, width, media) => {
      /* mediaStore were sorted by date in Node */
      if ((this.allPhotos !== media || this.width !== width) && width) {
        /* init */
        this.width = width
        this.allPhotos = media
        this.photoDates = []
        this.photoMapDates = []
        this.photoListWithSameDate = []
        this.allHeight = []
        this.rowHeightSum = 0
        this.indexHeightSum = []
        this.maxScrollTop = 0
        this.previousIndex = 1

        /* calculate photoMapDates and photoDates */
        const MAX = Math.floor((width - 60) / 218) - 1
        let MaxItem = MAX
        let lineIndex = 0
        const dateUnknown = []
        this.allPhotos.forEach((item) => {
          if (!item[1].metadata.exifDateTime) {
            dateUnknown.push(item)
            return
          }
          const formatExifDateTime = formatDate(item[1].metadata.exifDateTime)
          const isRepeat = this.photoDates[this.photoDates.length - 1] === formatExifDateTime
          if (!isRepeat || MaxItem === 0) {
            MaxItem = MAX
            this.photoDates.push(formatExifDateTime)
            this.photoMapDates.push({
              first: !isRepeat,
              index: lineIndex,
              date: formatExifDateTime,
              photos: [item]
            })
            if (!isRepeat) {
              this.photoListWithSameDate.push({
                date: formatExifDateTime,
                photos: [item]
              })
            } else {
              this.photoListWithSameDate[this.photoListWithSameDate.length - 1].photos.push(item)
            }
            lineIndex += 1
          } else {
            MaxItem -= 1
            this.photoMapDates[this.photoMapDates.length - 1].photos.push(item)
            this.photoListWithSameDate[this.photoListWithSameDate.length - 1].photos.push(item)
          }
        })
        if (dateUnknown.length > 0) {
          this.photoListWithSameDate.push({ date: '神秘时间', photos: [] })
          MaxItem = 0
          lineIndex += 1
          let isRepeat = false
          dateUnknown.forEach((item) => {
            this.photoListWithSameDate[this.photoListWithSameDate.length - 1].photos.push(item)
            if (MaxItem === 0) {
              MaxItem = MAX
              this.photoDates.push(0)
              this.photoMapDates.push({
                first: !isRepeat,
                index: lineIndex,
                date: '神秘时间',
                photos: [item]
              })
              lineIndex += 1
              isRepeat = true
            } else {
              MaxItem -= 1
              this.photoMapDates[this.photoMapDates.length - 1]
                .photos
                .push(item)
            }
          })
        }

        /* simulate large list */
        for (let i = 1; i <= 0; i++) {
          this.photoMapDates.push(...this.photoMapDates)
        }

        /* calculate each row's heigth and their sum */
        this.photoMapDates.forEach((list) => {
          const tmp = 218 * Math.ceil(list.photos.length / Math.floor((width - 60) / 218)) + !!list.first * 48
          this.allHeight.push(tmp)
          this.rowHeightSum += tmp
          this.indexHeightSum.push(this.rowHeightSum)
        })

        this.maxScrollTop = this.rowHeightSum - height + 16 * 2
      }
      return {
        allPhotos: this.allPhotos,
        photoDates: this.photoDates,
        photoMapDates: this.photoMapDates,
        indexHeightSum: this.indexHeightSum,
        allHeight: this.allHeight,
        maxScrollTop: this.maxScrollTop,
        rowHeightSum: this.rowHeightSum,
        currentDigest: this.memoizeValue.currentDigest,
        photoListWithSameDate: this.photoListWithSameDate
      }
    }

    this.getTimeline = (photoDates, indexHeightSum, maxScrollTop, height) => {
      const month = new Map()
      let dateUnknown = 0
      /* parse data to list of month */
      photoDates.forEach((date) => {
        if (!date) return (dateUnknown += 1)
        const b = date.split(/-/)
        const mix = `${b[0]}-${b[1]}`
        if (month.has(mix)) {
          month.set(mix, month.get(mix) + 1)
        } else {
          month.set(mix, 1)
        }
        return null
      })
      if (dateUnknown) month.set('0', dateUnknown)

      let sumCount = 0
      let spacingCount = 0
      let currentYear = null
      const timeline = [...month].map((data, index) => {
        let percentage = 0
        if (sumCount) {
          percentage = (indexHeightSum[sumCount - 1] - 200) / maxScrollTop
        }
        /* top = percentage * height + headerHeight - adjust */
        let top = percentage * height - 8

        const spacingPercentage = (indexHeightSum[spacingCount] - 200) / maxScrollTop
        const spacingTop = spacingPercentage * height

        sumCount += data[1]
        spacingCount += data[1]
        let date
        let zIndex = 2
        if (currentYear !== parseInt(data[0], 10)) {
          date = parseInt(data[0], 10)
        } else {
          date = <hr style={{ width: 8 }} />
        }
        currentYear = parseInt(data[0], 10)
        if (!index) { // first date
          top = 8
          spacingCount = 0
        } else if (index === month.size - 1) { // last date
          top += 20
          if (top > height - 26) top = height - 26
        } else if (spacingTop > 32 && date === parseInt(data[0], 10)) { // show years with enough spacing
          spacingCount = 0
        } else if (date === parseInt(data[0], 10)) { // hide years without enough spacing
          date = null
        } else { // show bar
          zIndex = 1
        }

        /* set range of displaying date*/
        if (top < 16 && index) date = null
        if (top > (height - 46) && index !== month.size - 1) date = null
        return [date, top, zIndex, percentage]
      })
      return timeline
    }

    this.setAnimation = (component, status) => {
      if (component === 'NavigationMenu') {
        /* add animation to NavigationMenu */
        const transformItem = this.refNavigationMenu
        const time = 0.4
        const ease = global.Power4.easeOut
        if (status === 'In') {
          TweenMax.to(transformItem, time, { rotation: 180, opacity: 1, ease })
        }
        if (status === 'Out') {
          TweenMax.to(transformItem, time, { rotation: -180, opacity: 0, ease })
        }
      }
    }

    this.memoize = (newValue) => {
      this.memoizeValue = Object.assign(this.memoizeValue, newValue)
      return this.memoizeValue
    }

    this.requestData = eq => this.apis.request(eq)

    this.addListToSelection = (digest) => {
      if (this.firstSelect) {
        this.ctx.openSnackBar('按住Shifit并点击，即可一次选择多项内容')
        this.firstSelect = false
      }
      const hadDigest = this.state.selectedItems.findIndex(item => item === digest) >= 0
      // debug('this.addListToSelection this.state.selectedItems', this.state.selectedItems, digest, hadDigest)
      if (!hadDigest) {
        this.setState({ selectedItems: [...this.state.selectedItems, digest] })
      }
    }

    this.removeListToSelection = (digest) => {
      // debug('this.removeListToSelection this.state.selectedItems', this.state.selectedItems)
      const hadDigest = this.state.selectedItems.findIndex(item => item === digest) >= 0
      if (hadDigest) {
        const index = this.state.selectedItems.findIndex(item => item === digest)
        this.setState({
          selectedItems: [
            ...this.state.selectedItems.slice(0, index),
            ...this.state.selectedItems.slice(index + 1)
          ]
        })
      }
    }

    this.clearSelect = () => { this.setState({ selectedItems: [] }) }

    this.getHoverPhoto = (digest) => {
      if (!this.state.selectedItems.length) return
      const lastSelect = this.state.selectedItems[this.state.selectedItems.length - 1]
      const lastSelectIndex = this.state.media.findIndex(photo => photo[0] === lastSelect)
      const hoverIndex = this.state.media.findIndex(photo => photo[0] === digest)
      let shiftHoverPhotos = this.state.media.slice(lastSelectIndex, hoverIndex + 1)

      if (hoverIndex < lastSelectIndex) shiftHoverPhotos = this.state.media.slice(hoverIndex, lastSelectIndex + 1)
      // debug('this.hover', digest, lastSelect, lastSelectIndex, hoverIndex, shiftHoverPhotos, this.state.shiftHoverItems)
      this.setState({ shiftHoverItems: shiftHoverPhotos.map(photo => photo[0]) })
    }

    this.getShiftStatus = (event) => {
      // debug('this.getShiftStatus', event.shiftKey)
      if (event.shiftKey === this.state.shift) return
      this.setState({ shift: event.shiftKey })
    }

    this.startDownload = () => {
      // debug('this.startDownload', this.state.selectedItems, this.memoizeValue)
      if (this.state.selectedItems.length > 0) {
        const photos = this.state.selectedItems
          .map(digest => this.state.media.find(photo => photo[0] === digest))
          .map(photo => ({
            name: getName(photo),
            size: photo[1].metadata.size,
            type: 'file',
            uuid: photo[0]
          }))
        debug('startDownload', photos, this.state.media.find(photo => photo[0] === this.state.selectedItems[0]))
        ipcRenderer.send('DOWNLOAD', { folders: [], files: photos, dirUUID: 'media' })
        this.setState({ selectedItems: [] })
      } else {
        const photo = this.state.media.find(item => item[0] === this.memoizeValue.currentDigest)
        const data = {
          name: getName(photo),
          size: photo[1].metadata.size,
          type: 'file',
          uuid: photo[0]
        }
        debug('startDownload', data, photo)
        ipcRenderer.send('DOWNLOAD', { folders: [], files: [data], dirUUID: 'media' })
      }
    }

    this.removeMedia = () => {
      if (this.state.selectedItems.length > 0) {
        this.ctx.openSnackBar(`移除${this.state.selectedItems.length}张照片`)
        this.setState({ selectedItems: [] })
      } else {
        this.ctx.openSnackBar('移除照片成功')
      }
    }

    this.hideMedia = () => {
      if (this.state.selectedItems.length > 0) {
        this.ctx.openSnackBar(`隐藏${this.state.selectedItems.length}张照片`)
        this.setState({ selectedItems: [] })
      } else {
        this.ctx.openSnackBar('隐藏照片成功')
      }
    }

    this.uploadMedia = () => {
      if (!this.ctx.props.apis.listNavDir || !this.ctx.props.apis.listNavDir.data) {
        this.ctx.openSnackBar('上传失败！')
        return
      }
      const data = this.ctx.props.apis.listNavDir.data
      const rootUUID = data.path[0].uuid
      const index = data.entries.findIndex(entry => entry.name === '上传的照片')
      if (index > -1) {
        // debug('uploadMedia', rootUUID, this.ctx.props.apis.listNavDir.data)
        ipcRenderer.send('UPLOADMEDIA', data.entries[index].uuid)
      } else {
        // debug('mkdir', rootUUID, this.ctx.props.apis.listNavDir.data)
        this.ctx.props.apis.request('mkdir', { dirUUID: rootUUID, dirname: '上传的照片' }, (err, uuid) => {
          if (err) {
            this.ctx.openSnackBar(`上传失败：${err.message}`)
          } else {
            ipcRenderer.send('UPLOADMEDIA', uuid)
          }
        })
      }
      // ipcRenderer.send('UPLOADMEDIA', rootUUID)
    }
  }

  setState(props) {
    this.state = Object.assign({}, this.state, props)
    this.emit('updated', this.state)
  }

  willReceiveProps(nextProps) {
    // console.log('media nextProps', nextProps)
    if (!nextProps.apis || !nextProps.apis.media) return
    const media = nextProps.apis.media
    if (media.isPending() || media.isRejected()) return

    /* now it's fulfilled */
    const value = media.value()

    this.apis = nextProps.apis

    if (value !== this.state.preValue) {
      /* remove photos without metadata */
      const filter = value.filter(item => !!item[1].metadata)

      /* sort photos by date */
      filter.sort((prev, next) => (parseDate(next[1].metadata.exifDateTime) - parseDate(prev[1].metadata.exifDateTime)) || (
        parseInt(`0x${next[0]}`, 16) - parseInt(`0x${prev[0]}`, 16)))

      this.setState({ preValue: value, media: filter })
    }
  }

  navEnter() {
    this.ctx.props.apis.request('media')
  }

  navLeave() {
  }

  navGroup() {
    return 'media'
  }

  menuName() {
    return '我的照片'
  }

  menuIcon() {
    return PhotoIcon
  }

  quickName() {
    return '照片'
  }

  appBarStyle() {
    return 'light'
  }

  prominent() {
    return false
  }

  hasDetail() {
    return false
  }

  detailEnabled() {
    return true
  }

  detailWidth() {
    return 400
  }

  hasQuickNav() {
    return !this.state.selectedItems.length
  }

  renderNavigationMenu({ style, onTouchTap }) {
    const CustomStyle = Object.assign(style, { opacity: 1 })
    return (
      <div style={CustomStyle} ref={ref => (this.refNavigationMenu = ref)}>
        <IconButton onTouchTap={onTouchTap}>
          <NavigationMenu color="rgba(0,0,0,0.54)" />
        </IconButton>
      </div>
    )
  }

  renderTitle({ style }) {
    const newStyle = Object.assign(style, { color: 'rgba(0,0,0,0.54)' })
    return (
      <div style={newStyle}>
        我的照片
      </div>
    )
  }

  renderToolBar({ style }) {
    return (
      <div style={style}>
        <FlatButton label="上传" onTouchTap={this.uploadMedia} primary />
      </div>
    )
  }

  renderContent() {
    return (<PhotoApp
      media={this.state.media}
      setPhotoInfo={this.setPhotoInfo}
      getTimeline={this.getTimeline}
      ipcRenderer={ipcRenderer}
      apis={this.apis}
      requestData={this.requestData}
      setAnimation={this.setAnimation}
      memoize={this.memoize}
      removeListToSelection={this.removeListToSelection}
      addListToSelection={this.addListToSelection}
      selectedItems={this.state.selectedItems}
      clearSelect={this.clearSelect}
      primaryColor={this.groupPrimaryColor()}
      startDownload={this.startDownload}
      removeMedia={this.removeMedia}
      hideMedia={this.hideMedia}
      getHoverPhoto={this.getHoverPhoto}
      getShiftStatus={this.getShiftStatus}
      shiftStatus={{ shift: this.state.shift, items: this.state.shiftHoverItems }}
    />)
  }
}

export default Media
