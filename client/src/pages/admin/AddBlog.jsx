import React, { useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Color from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import HorizontalRule from '@tiptap/extension-horizontal-rule'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../contexts/AppContext'
import toast from 'react-hot-toast'
import { assets } from '../../assets/assets'

const AddBlog = () => {
  const navigate = useNavigate()
  const { axios } = useAppContext()
  const [loading, setLoading] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    subTitle: '',
    category: '',
    description: '',
    image: null
  })

  // Add smooth scroll behavior for the entire page
  useEffect(() => {
    // Add smooth scroll behavior to the entire page
    document.documentElement.style.scrollBehavior = 'smooth'
    
    return () => {
      document.documentElement.style.scrollBehavior = 'auto'
    }
  }, [])

  // Rich text editor setup
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Color,
      FontFamily,
      HorizontalRule,
    ],
    content: formData.description,
    onUpdate: ({ editor }) => {
      setFormData({
        ...formData,
        description: editor.getHTML()
      })
    }
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.title || !formData.category || !formData.description || !formData.image) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      
      // Create FormData for file upload
      const submitData = new FormData()
      submitData.append('Blog', JSON.stringify({
        title: formData.title,
        subtitle: formData.subTitle,
        description: formData.description,
        category: formData.category,
        isPublished: true
      }))
      submitData.append('image', formData.image)

      // Submit to backend
      const { data } = await axios.post('/api/blog/add', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (data.success) {
        toast.success('Blog created successfully!')
        // Reset form
        setFormData({
          title: '',
          subTitle: '',
          category: '',
          description: '',
          image: null
        })
        if (editor) {
          editor.commands.setContent('')
        }
        // Navigate to blog list
        navigate('/admin/blog-list')
      } else {
        toast.error(data.message || 'Failed to create blog')
      }
    } catch (error) {
      console.error('Blog creation error:', error)
      console.error('Error response:', error.response)
      console.error('Error data:', error.response?.data)
      
      // More detailed error handling
      let errorMessage = 'Failed to create blog. Please try again.'
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      } else if (error.message) {
        errorMessage = error.message
      }
      
      // Show additional debugging info in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Full error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers
        })
      }
      
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFormData({
        ...formData,
        image: file
      })
    }
  }

  // AI content generation function
  const handleAIGenerate = async () => {
    if (!formData.title) {
      toast.error('Please enter a title first')
      return
    }
    
    if (!formData.category) {
      toast.error('Please select a category first')
      return
    }

    try {
      setAiGenerating(true)
      console.log('Starting AI generation with:', { title: formData.title, category: formData.category, subtitle: formData.subTitle })
      
      // Call backend AI endpoint
      const { data } = await axios.post('/api/blog/generateContent', {
        title: formData.title,
        category: formData.category,
        subtitle: formData.subTitle
      })

      console.log('AI generation response:', data)

      if (data.success) {
        // Set the generated content in the editor
        if (editor) {
          console.log('Setting editor content:', data.data.content)
          editor.commands.setContent(data.data.content)
          setFormData({
            ...formData,
            description: data.data.content
          })
        }
        toast.success('AI content generated successfully!')
      } else {
        console.error('AI generation failed:', data.message)
        toast.error(data.message || 'Failed to generate AI content')
      }
    } catch (error) {
      console.error('AI generation error:', error)
      console.error('Error response:', error.response?.data)
      toast.error(error.response?.data?.message || 'Failed to generate AI content. Please try again.')
    } finally {
      setAiGenerating(false)
    }
  }

  // Toolbar button component
  const ToolbarButton = ({ onClick, isActive, children, title, className = '' }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded-md transition-colors ${
        isActive 
          ? 'bg-accent-soft text-accent' 
                          : 'text-gray-600 hover:text-accent hover:bg-accent-soft'
      } ${className}`}
      title={title}
    >
      {children}
    </button>
  )

  return (
    <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8 min-h-full bg-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-heading">Add New Blog</h1>
        <button
          type="button"
          onClick={async () => {
            try {
              if (!formData.title) {
                toast.error('Title is required to save a draft')
                return
              }
              setLoading(true)
              const draftData = new FormData()
              draftData.append('Blog', JSON.stringify({
                title: formData.title,
                subtitle: formData.subTitle,
                description: formData.description,
                category: formData.category,
                isPublished: false
              }))
              if (formData.image) {
                draftData.append('image', formData.image)
              }
              const { data } = await axios.post('/api/blog/add', draftData, {
                headers: { 'Content-Type': 'multipart/form-data' }
              })
              if (data.success) {
                toast.success('Draft saved!')
                navigate('/admin/blog-list')
              } else {
                toast.error(data.message || 'Failed to save draft')
              }
            } catch (err) {
              toast.error(err.response?.data?.message || 'Failed to save draft')
            } finally {
              setLoading(false)
            }
          }}
          className="mt-4 sm:mt-0 bg-accent text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-accent-hover transition-colors text-sm sm:text-base cursor-pointer font-bold uppercase tracking-wide"
        >
          Save Draft
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-lg border border-border p-4 sm:p-6 lg:p-8">
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Title and Subtitle Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-bold text-heading mb-1 sm:mb-2">
                Blog Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm sm:text-base font-semibold"
                placeholder="Enter blog title"
                required
              />
            </div>

            {/* Subtitle */}
            <div>
              <label className="block text-sm font-bold text-heading mb-1 sm:mb-2">
                Subtitle
              </label>
              <input
                type="text"
                name="subTitle"
                value={formData.subTitle}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm sm:text-base font-semibold"
                placeholder="Enter subtitle"
              />
            </div>
          </div>

          {/* Category and Image Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-bold text-heading mb-1 sm:mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 sm:px-4 py-3 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent text-sm sm:text-base font-semibold"
                required
              >
                <option value="">Select category</option>
                <option value="Technology">Tech/Startup</option>
                <option value="Lifestyle">Lifestyle</option>
                <option value="Finance">Finance</option>
                <option value="Politics">Politics</option>
                <option value="Sports">Sports</option>
                <option value="Geography">Geography</option>
                <option value="Education">Education</option>
              </select>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-bold text-heading mb-1 sm:mb-2">
                Blog Image *
              </label>
              <div className="border-2 border-dashed border-border rounded-lg p-3 sm:p-4 text-center">
                {formData.image ? (
                  <div className="space-y-3">
                    <img 
                      src={URL.createObjectURL(formData.image)} 
                      alt="Preview" 
                      className="mx-auto h-32 w-auto rounded-lg object-cover"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-sm text-muted font-semibold">{formData.image.name}</span>
                      <button
                        type="button"
                        onClick={() => setFormData({...formData, image: null})}
                        className="text-red-600 hover:text-red-800 text-sm font-bold border border-red-600 hover:border-red-800 px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <img src={assets.upload_area} alt="upload" className="mx-auto h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400 mb-2 sm:mb-3" />
                    <div className="text-xs sm:text-sm text-muted">
                      <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-bold text-heading hover:text-muted focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-accent border border-border px-3 py-1">
                        <span>Upload a file</span>
                        <input
                          id="image-upload"
                          name="image"
                          type="file"
                          className="sr-only"
                          accept="image/*"
                          onChange={handleImageChange}
                          required
                        />
                      </label>
                      <p className="pl-1 font-semibold">or drag and drop</p>
                    </div>
                    <p className="text-xs text-muted font-semibold">PNG, JPG, GIF up to 10MB</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* AI Content Generation Button - Moved to content box */}
          {/* Rich Text Editor */}
    <div>
            <label className="block text-sm font-bold text-heading mb-1 sm:mb-2">
              Blog Content *
            </label>
            
            {/* AI Generation Status */}
            {aiGenerating && (
              <div className="mb-3 p-3 bg-accent-soft border border-accent/20 rounded-lg">
                <div className="flex items-center gap-2 text-heading">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
                  <span className="text-sm font-bold">AI is generating your blog content...</span>
                </div>
                <p className="text-xs text-muted mt-1 font-semibold">This may take a few moments. Please wait.</p>
              </div>
            )}
            
            {/* Toolbar */}
            <div className="border border-border rounded-t-md bg-slate-50 p-3 flex flex-wrap items-center gap-2">
              {/* Undo/Redo */}
              <div className="flex items-center gap-1 border-r border-border pr-2">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().undo().run()}
                  title="Undo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </ToolbarButton>
                <ToolbarButton
                  onClick={() => editor?.chain().focus().redo().run()}
                  title="Redo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                  </svg>
                </ToolbarButton>
              </div>

              {/* Font Family */}
              <div className="border-r border-border pr-2">
                <select 
                  onChange={(e) => editor?.chain().focus().setFontFamily(e.target.value).run()}
                  className="px-2 py-1 text-xs border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-accent font-semibold"
                  title="Font Family"
                >
                  <option value="Lora">Lora</option>
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Verdana">Verdana</option>
                </select>
              </div>

              {/* Text Case - Disabled (extension not available) */}
              <div className="border-r border-gray-300 pr-2">
                <ToolbarButton
                  onClick={() => {}}
                  title="Text Case (Coming Soon)"
                  className="opacity-50 cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </ToolbarButton>
              </div>

              {/* Text Formatting */}
              <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBold().run()}
                  isActive={editor?.isActive('bold')}
                  title="Bold"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 12h8a4 4 0 100-8H6v8z" />
                  </svg>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleItalic().run()}
                  isActive={editor?.isActive('italic')}
                  title="Italic"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleUnderline().run()}
                  isActive={editor?.isActive('underline')}
                  title="Underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </ToolbarButton>
              </div>

              {/* Text Color */}
              <div className="border-r border-gray-300 pr-2">
                <ToolbarButton
                  onClick={() => {
                    const color = prompt('Enter color (e.g., #ff0000, red, blue):', '#000000')
                    if (color) editor?.chain().focus().setColor(color).run()
                  }}
                  title="Text Color"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                </ToolbarButton>
              </div>

              {/* Text Alignment */}
              <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                  isActive={editor?.isActive({ textAlign: 'left' })}
                  title="Align Left"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h8M4 12h8M4 18h8" />
                  </svg>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                  isActive={editor?.isActive({ textAlign: 'center' })}
                  title="Align Center"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h8M8 12h8M8 18h8" />
                  </svg>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                  isActive={editor?.isActive({ textAlign: 'right' })}
                  title="Align Right"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6h8M12 12h8M12 18h8" />
                  </svg>
                </ToolbarButton>
              </div>

              {/* Lists */}
              <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                  isActive={editor?.isActive('orderedList')}
                  title="Numbered List"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBulletList().run()}
                  isActive={editor?.isActive('bulletList')}
                  title="Bullet List"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </ToolbarButton>
              </div>

              {/* Indentation - Disabled (extension not available) */}
              <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                <ToolbarButton
                  onClick={() => {}}
                  title="Indent Left (Coming Soon)"
                  className="opacity-50 cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => {}}
                  title="Indent Right (Coming Soon)"
                  className="opacity-50 cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-4 4m4-4l-4-4" />
                  </svg>
                </ToolbarButton>
              </div>

              {/* Headings */}
              <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                  isActive={editor?.isActive('heading', { level: 1 })}
                  title="Heading 1"
                >
                  H1
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                  isActive={editor?.isActive('heading', { level: 2 })}
                  title="Heading 2"
                >
                  H2
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
                  isActive={editor?.isActive('heading', { level: 3 })}
                  title="Heading 3"
                >
                  H3
                </ToolbarButton>
              </div>

              {/* Additional Formatting */}
              <div className="flex items-center gap-1">
                <ToolbarButton
                  onClick={() => editor?.chain().focus().toggleBlockquote().run()}
                  isActive={editor?.isActive('blockquote')}
                  title="Quote"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                  title="Horizontal Rule"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                  </svg>
                </ToolbarButton>
                
                <ToolbarButton
                  onClick={() => {
                    const url = prompt('Enter URL:')
                    if (url) editor?.chain().focus().setLink({ href: url }).run()
                  }}
                  title="Insert Link"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </ToolbarButton>
              </div>
            </div>
            
            {/* Editor Content */}
            <div className="border border-t-0 border-border rounded-b-md relative">
              <EditorContent 
                editor={editor} 
                className="prose max-w-none p-4 min-h-[300px]"
              />
              
              {/* AI Generation Button - Bottom Right Corner */}
              <div className="absolute bottom-4 right-4">
                <button
                  type="button"
                  onClick={handleAIGenerate}
                  disabled={aiGenerating}
                  className="inline-flex items-center gap-2 bg-accent text-white px-3 py-2 rounded-lg hover:bg-accent-hover transition-all duration-200 text-sm font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  title="Generate blog content with AI"
                >
                  {aiGenerating ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  )}
                  {aiGenerating ? 'Generating...' : 'AI'}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-6 pt-4 sm:pt-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-accent text-white py-3 px-4 sm:px-6 rounded-md hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors text-sm sm:text-base font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating Blog...
                </div>
              ) : (
                'Publish Blog'
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/blog-list')}
              disabled={loading}
              className="flex-1 sm:flex-none bg-white text-heading py-3 px-4 sm:px-6 rounded-md hover:bg-accent-soft focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 transition-colors text-sm sm:text-base font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed border border-border"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddBlog
