/**
 * @component MoveDialog
 * @description MoveDialog
 * @time 2016-6-23
 * @author liuhua
**/
'use strict';
// require core module
import React, { findDOMNode, Component, PropTypes } from 'react';
//material
import { SvgIcon } from 'material-ui'
//import Action
import Action from '../../actions/action';
import svg from '../../utils/SVGIcon';

class Move extends Component {
	render() {
		let left = this.props.state.navigation.menu?this.props.state.view.move.x-220:this.props.state.view.move.x-20;
		let top = this.props.state.view.move.y-120;  
		let scroll = !!document.getElementsByClassName('file-area')[0]?document.getElementsByClassName('file-area')[0].scrollTop:0
		const style = {
			display: this.props.state.view.move.open==false?'none':'block',
			top:top+scroll,
			left:left,
		}
		if (this.props.state.tree.isNull) {
			return null
		}
		return (
			<div style={style} className='move-dialog'>
				<div className='move-title'>
					<SvgIcon style={{marginLeft:'14px',cursor:'pointer'}} onClick={this.moveSelect.bind(this,this.props.state.tree.parent)}>{svg['back']()}</SvgIcon>
					<span className='move-title-name'>{this.props.state.tree.name}</span>
					<SvgIcon className='move-close' onClick={this.closeMove.bind(this)}>{svg['close']()}</SvgIcon>
				</div>
				<div className='move-content'>
					<div className='move-list-container'>
						{this.props.state.tree.children.map(item=>
							<div className={item.checked?'move-list-selected move-list':'move-list'} key={item.uuid}>
								<span className='move-folder-icon'></span>
								<span>{item.name}</span>
								<span className={this.shouldEnter.apply(this,[item])}  onClick={this.moveSelect.bind(this,item.uuid)}></span>
							</div>
						)}
					</div>
					<div className='move-button-container'>
						<div className={this.props.state.tree.uuid==this.props.state.data.directory.uuid?'move-botton move-botton-disable':'move-botton'} onClick={this.move.bind(this)}>移动</div>
					</div>
				</div>
			</div>
			)
	}

	closeMove() {
		this.props.dispatch(Action.closeMove());
	}

	shouldEnter(item) {
		let selectitem = this.props.state.data.children.filter(i=>i.checked==true);
		let isContainer = selectitem.find(i=>i.uuid == item.uuid);
		if (isContainer == undefined) {
			return 'moveEnter'	
		}else {
			return 'moveEnter-hidden'
		}
		
	}

	moveSelect(uuid) {
		ipc.send('getTreeChildren',uuid);
	}

	move() {
		if (this.props.state.tree.uuid==this.props.state.data.directory.uuid) {
			return false
		}
		let moveArr = this.props.state.data.children.filter(item=>item.checked==true);
		let target = this.props.state.tree.uuid;
		this.closeMove();
		ipc.send('move',moveArr,target);
	}
}

export default Move;