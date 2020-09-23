import imagesServices from '../services/imagesService'


export const getImages = () => {
  return async dispatch => {
    const response = await imagesServices.getAllImages()
    let data = response.data
    dispatch({
      type:'ALLIMAGES',
      data
    })
  }
}

export const deleteImage = (obj) => {
  return async dispatch => {
    await imagesServices.deleteImage(obj)
    dispatch({
      type:'DELETEIMAGE',
      obj
    })
  }
}

export const exchangeImage = (obj) => {
  return async dispatch => {
    dispatch({
      type:'EXCHANGEIMAGE',
      obj
    })
  }
}


export const newImage = (data) => {
  return async dispatch => {
    dispatch({
      type:'NEWIMAGE',
      data
    })
  }
}

const imagesReducer = (state = [], action) => {
  switch (action.type){
  case 'ALLIMAGES':
    return action.data
  case 'NEWIMAGE':
    return state.concat(action.data)
  case 'DELETEIMAGE':
    return state.filter(i => i.rowid !== action.obj.rowid)
  case 'EXCHANGEIMAGE':
    return state.filter(i => i.rowid !== action.obj.rowid).concat(action.obj)
  default:
    return state
  }
}

export default imagesReducer