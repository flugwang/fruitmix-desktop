import React from 'react'
import ReactDOM from 'react-dom'

import Radium from 'radium'

import { ipcRenderer, clipboard } from 'electron'
import request from 'superagent'
import Debug from 'debug'
const debug = Debug('component:DeviceCard')

import muiThemeable from 'material-ui/styles/muiThemeable'
import LinearProgress from 'material-ui/LinearProgress'
import { Paper, RaisedButton, IconButton, Dialog } from 'material-ui'
import FlatButton from '../common/FlatButton'
import ActionOpenInBrowser from 'material-ui/svg-icons/action/open-in-browser'
import { grey700, grey400, grey500, blueGrey400, blueGrey500 } from 'material-ui/styles/colors'

import keypress from '../common/keypress'

import ErrorBox from './ErrorBox'
import UserBox from './UserBox'
import GuideBox from './GuideBox'
import ModelNameCard from './ModelNameCard'

const MaintBox = props => (
    <div style={{width: '100%', height: 64, backgroundColor: 'rgba(128,128,128,0.8)',
      display:'flex', alignItems: 'center', justifyContent: 'space-between',
      boxSizing: 'border-box', paddingLeft: 24, paddingRight: 24}}>

      <div style={{color: '#FFF' }}>{props.text}</div>
      <FlatButton label='维护模式' onTouchTap={props.onMaintain} />
    </div>
  )

class DeviceCard extends React.Component {

  constructor(props) {

    super(props)
    this.state = {
			initWiard: 'close',
      toggle: false,
      horizontalExpanded: false,
      boot: null,
      storage: null,
      users: null,
    }

    ipcRenderer.send('setServerIp', props.device.address)

    this.requestGet = (port, ep, propName) =>
      request.get(`http://${this.props.device.address}:${port}/${ep}`)
        .set('Accept', 'application/json')
        .end((err, res) => {

          if (this.unmounted) return

          debug('request get', ep, propName, err || res.body)

          this.setState(state => {
            let nextState = {}
            nextState[propName] = err ? err : res.body
            return nextState
          })
        })

    this.refresh = () => {

      if (this.unmounted) return

      this.setState(state => Object.assign({}, state, { boot: null, storage: null, users: null }))

      this.requestGet(3000, 'system/boot', 'boot')
      this.requestGet(3000, 'system/storage', 'storage')
      this.requestGet(3721, 'login', 'users')
    }

    this.requestToken = (uuid, password, callback) =>
      this.unmounted
        ? setImmediate(callback(new Error('device card component unmounted')))
        : request.get(`http://${this.props.device.address}:3721/token`)
            .auth(uuid, password)
            .set('Accept', 'application/json')
            .end((err, res) =>
              this.unmounted
                ? callback(new Error('device card component unmounted'))
                : callback(err, res))

    this.reset = () => {

      if (this.unmounted) return

      this.setState(state => ({
        toggle: true,
        horizontalExpanded: true,
        boot: null,
        storage: null,
        users: null,
      }))



      this.requestGet(3000, 'system/boot', 'boot')
      this.requestGet(3000, 'system/storage', 'storage')
      this.requestGet(3721, 'login', 'users')
    }

    this.maintain = () => {
      window.store.dispatch({
        type: 'ENTER_MAINTENANCE',
        data: {
          device: this.props.device,
          boot: this.state.boot,
          storage: this.state.storage,
        }
      })
    }

		this.states = () => {

			if(this.state.toggle === true){
				return states = open
			}
			else {
				return states = close
			}

			return states
		}

		this.onOpen = () => {

			this.setState(Object.assign({}, this.state, {initWiard: 'opening'}))
			setTimeout (() => {
			  this.onBoxResize('VEXPAND')
				setTimeout (() => {
					this.props.onResize('HEXPAND')
					this.setState(Object.assign({}, this.state, {initWiard: 'open'}))
				},350)
			},350)
		}

		this.onClose = () => {

			this.setState(Object.assign({}, this.state, {initWiard: 'closeing'}))
			setTimeout (() => {
				this.props.onResize('HSHRINK')
				setTimeout (() => {
					this.onBoxResize('VSHRINK')
					this.setState(Object.assign({}, this.state, {initWiard: 'close'}))
				},350)
			},350)
		}

    this.onBoxResize = resize => {
      if ((resize === 'VEXPAND' && this.state.toggle === false) || (resize === 'VSHRINK' && this.state.toggle === true))
        this.setState(Object.assign({}, this.state, { toggle: !this.state.toggle }))
      else if (resize === 'HEXPAND' || resize === 'HSHRINK')
        this.props.onResize(resize)
    }

    this.verticalExpand = () => {}
    this.verticalShrink = () => {}

    // quick fix, refresh cannot be used here, setState() cannot be called inside constructor (not mounted)
    this.requestGet(3000, 'system/boot', 'boot')
    this.requestGet(3000, 'system/storage', 'storage')
    this.requestGet(3721, 'login', 'users')
  }

  componentDidMount() {

    // create keypress listener
    this.keypress = new keypress.Listener()

    // listen window keydown keyup event
    window.addEventListener('keydown', this.keypress)
    window.addEventListener('keyup', this.keypress)

    this.keypress.sequence_combo('up up down down left right left right b a enter', () => {

      let text = 'The Contra Code was actually first used in Gradius for NES in 1986 by Konami.'
      console.log(text)

      this.maintain()
    })
  }

  componentWillUnmount() {

    this.unmounted = true

    // clean up keypress
    this.keypress.reset()
    this.keypress.stop_listening()
    this.keypress.destroy()
    this.keypress = null

    // remove listener
    window.removeEventListener('keydown', this.keypress, false)
    window.removeEventListener('keyup', this.keypress, false)
  }

  componentWillEnter(callback) {
    this.props.onWillEnter(ReactDOM.findDOMNode(this), callback)
  }

  componentWillLeave(callback) {
    this.props.onWillLeave(ReactDOM.findDOMNode(this), callback)
  }

  // this is the logic branching place

  renderFooter() {

    if (this.state.boot === null || this.state.storage === null || this.state.users === null) {
      return (
        <div style={{width: '100%',height: 68,display: 'flex', alignItems: 'center', boxSizing: 'border-box',flexWrap: 'wrap'}}>
          <div style={{height: 4,width: 480}}><LinearProgress mode="indeterminate" /></div>
          <div style={{width: '100%', height: 64, backgroundColor: '#FFF',
            display: 'flex', alignItems: 'center', boxSizing: 'border-box', paddingLeft: 24}}>
            通讯中....
          </div>
        </div>
      )
    }

    if (this.state.boot instanceof Error || this.state.storage instanceof Error) {
      return (
        <div style={{width: '100%', height: 64, backgroundColor: '#FFF', display: 'flex', alignItems: 'center', boxSizing: 'border-box', paddingLeft: 24}}>
          无法与该设备通讯，它可能刚刚离线或正在启动。
        </div>
      )
    }
    // not both boot and storage are OK

    // if we have user array (not error)
    if (this.state.users && Array.isArray(this.state.users)) {
      if (this.state.users.length !== 0)
        return (
          <UserBox
            style={{width: '100%', transition: 'all 300ms', position:'relative'}}
            color={this.props.backgroundColor}
            users={this.state.users}
            onResize={this.onBoxResize}
            toggleDim={this.props.toggleDim}
            requestToken={this.requestToken}
          />
        )
      else{

        text = '系统不存在用户，请进入维护模式'
        return <MaintBox text={text} onMaintain={this.maintain} />
      }
    }
    // now boot and storage ready, users should be error

    // if boot state is normal or alternative and users is ERROR, this is undefined case, should display errorbox
    if ((this.state.boot.state === 'normal' || this.state.boot.state === 'alternative') && this.state.users instanceof Error)
      return (
        <ErrorBox
          text='系统启动但应用服务无法连接，请重启服务器。'
          error={JSON.stringify({
            boot: this.state.boot,
            storage: this.state.storage,
            users: this.state.users
          }, null, '  ')}
        />
      )

    // now boot state should not be normal or alternative, must be maintenance, assert it!
    if (this.state.boot.state !== 'maintenance') {

      setTimeout(() => {
        throw new Error('Undefined State: boot state is not maintenance')
      }, 5000)
      return
    }

    let text = '系统未能启动上次使用的wisnuc应用'
    if (this.state.boot.lastFileSystem) {

      if (this.state.boot.bootMode === 'maintenance')
        text = '用户指定启动至维护模式'

      return <MaintBox text={text} onMaintain={this.maintain} />
    }

    // now this.state.boot.lastFileSystem is null
    // 1. if there is suspicious wisnuc, select maintenance
    let storage = this.state.storage
    let fileSystems = [...storage.volumes, ...storage.blocks.filter(blk => !blk.isVolumeDevice && blk.isFileSystem)]

    let suspicious = fileSystems
                      .filter(f => !!f.wisnuc)
                      .find(f => f.wisnuc === 'ERROR' || !f.wisnuc.intact)

    if (suspicious)
      return <MaintBox text={text} onMaintain={this.maintain} />

    // if (storage.volumes.find(v => v.isMissing))
    if (storage.volumes.length > 0)
      return <MaintBox text={text} onMaintain={this.maintain} />

    return (
      <GuideBox
        address={this.props.device.address}
        storage={this.state.storage}
				initWiard={this.state.initWiard}
				onOpen={this.onOpen}
				onClose={this.onClose}
        onMaintain={this.maintain}
      />
    )

    // there are following possibilities:
    // 1. user forced boot to maintenance mode.
    //    actions depends on system state, including:
    //    a) select one bootable system to boot, if any
    //    b) select one file system and re-init (delete old one)
    //    c) rebuild a file system to install new one
    //
    // 2. the lfs exists but not bootable, either volume missing, or fruitmix deleted.
    //    a) fix
    //    b) reinstall wisnuc
    //    c) rebuild a file system to install new one
    //
    // 3. no bootable file system
    //    a) reinstall or rebuild
    // 4. more than one bootable file system
    //    a) select one file system and boot
    //    b) reinstall or rebuild
  }

  render() {

    let bcolor = this.state.toggle ? grey500 : this.props.backgroundColor || '#3f51B5'

    let paperStyle = {
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      backgroundColor: bcolor,
      transition: 'all 300ms'
    }

    return (
      <div style={this.props.style}>

				<ModelNameCard
					toggle={this.state.toggle}
					device={this.props.device}
					backgroundColor={this.props.backgroundColor}
					onNavPrev={this.props.onNavPrev}
					onNavNext={this.props.onNavNext}
				/>
        { this.renderFooter() }
      </div>
    )
  }
}

export default DeviceCard

